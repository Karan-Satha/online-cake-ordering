import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { getProductImageUrl } from "../storage/objectStorage.js";

function formatOrder(order, items, isNew = false) {
  const formattedItems = items.map((item) => ({
    id: item.product_id ?? item.id,
    name: item.variant_name ? `${item.product_name ?? item.name} — ${item.variant_name}` : (item.product_name ?? item.name),
    image: getProductImageUrl(item.image),
    priceInPence: item.price_in_pence,
    quantity: item.quantity,
  }));

  const subtotalInPence = formattedItems.reduce((total, item) => total + item.priceInPence * item.quantity, 0);
  const discountInPence = order.discount_in_pence || 0;

  return {
    id: order.id,
    customerName: order.customer_name,
    customerEmail: order.customer_email,
    customerPhone: order.customer_phone,
    deliveryAddress: order.delivery_address,
    deliveryCity: order.delivery_city,
    deliveryPostcode: order.delivery_postcode,
    deliveryNotes: order.delivery_notes,
    subtotalInPence,
    discountCode: order.discount_code || null,
    discountInPence,
    // total = subtotal - discount + delivery, so delivery is whatever's
    // left over once subtotal and discount are accounted for.
    deliveryFeeInPence: order.total_in_pence - subtotalInPence + discountInPence,
    totalInPence: order.total_in_pence,
    status: order.status,
    createdAt: order.created_at,
    items: formattedItems,
    // True only when this call actually inserted the row. Callers (the
    // webhook) should use this to decide whether to send the confirmation
    // email — a dedup-hit (Stripe redelivering the same event, or a retry
    // after a crash between order-creation and marking the session
    // complete) must never trigger a second email.
    isNew,
  };
}

/**
 * Looks up an already-created order by its Stripe checkout session id.
 * Returns null if no order exists yet for this session (e.g. the webhook
 * hasn't processed it yet) rather than throwing, so callers like the
 * confirmation page can distinguish "not ready yet" from a real error.
 */
export async function getOrderByStripeSessionId(stripeSessionId) {
  const orderResult = await pool.query(
    `
      SELECT *
      FROM orders
      WHERE stripe_session_id = $1
    `,
    [stripeSessionId],
  );

  const order = orderResult.rows[0];

  if (!order) {
    return null;
  }

  const itemsResult = await pool.query(
    `
      SELECT
        product_id,
        product_name,
        variant_name,
        price_in_pence,
        quantity
      FROM order_items
      WHERE order_id = $1
      ORDER BY id
    `,
    [order.id],
  );

  return formatOrder(order, itemsResult.rows);
}

/**
 * Creates an order from a cart plus delivery/payment details.
 *
 * This should only ever be called from the Stripe webhook handler
 * (checkout.session.completed) — it's the only reliably-delivered signal
 * that payment actually succeeded. If payment.stripeSessionId is provided
 * and an order already exists for it, that existing order is returned
 * instead of creating a duplicate (Stripe may redeliver the same webhook
 * event more than once).
 */
export async function createOrderService(cartId, orderData, payment = {}) {
  const { customerName, customerEmail, customerPhone, deliveryAddress, deliveryCity, deliveryPostcode, deliveryNotes } =
    orderData;

  if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !deliveryCity || !deliveryPostcode) {
    throw new AppError("Please complete all required fields", 400);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (payment.stripeSessionId) {
      const existingOrderResult = await client.query(
        `
          SELECT *
          FROM orders
          WHERE stripe_session_id = $1
        `,
        [payment.stripeSessionId],
      );

      if (existingOrderResult.rows.length > 0) {
        await client.query("ROLLBACK");

        const existingOrder = existingOrderResult.rows[0];
        const itemsResult = await pool.query(
          `
            SELECT product_id, product_name, variant_name, price_in_pence, quantity
            FROM order_items
            WHERE order_id = $1
            ORDER BY id
          `,
          [existingOrder.id],
        );

        return formatOrder(existingOrder, itemsResult.rows, false);
      }
    }

    // Get cart items
    const cartResult = await client.query(
      `
        SELECT
          p.id,
          p.name,
          COALESCE(pv.price_in_pence, p.price_in_pence) AS price_in_pence,
          p.image,
          ci.quantity,
          ci.variant_id,
          pv.name AS variant_name
        FROM cart_items ci
        JOIN products p
          ON p.id = ci.product_id
        LEFT JOIN product_variants pv ON pv.id = ci.variant_id
        WHERE ci.cart_id = $1
      `,
      [cartId],
    );

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    // Calculate total
    const totalInPence = cartItems.reduce((total, item) => total + item.price_in_pence * item.quantity, 0);

    const deliveryFeeInPence = Number(payment.deliveryFeeInPence || 0);
    const discountInPence = Number(payment.discountInPence || 0);
    const orderTotalInPence = totalInPence - discountInPence + deliveryFeeInPence;

    if (payment.expectedTotalInPence !== undefined && orderTotalInPence !== payment.expectedTotalInPence) {
      throw new AppError("Your basket changed during payment. Please try again.", 409);
    }

    // Create order
    const orderResult = await client.query(
      `
        INSERT INTO orders (
          customer_name,
          customer_email,
          customer_phone,
          delivery_address,
          delivery_city,
          delivery_postcode,
          delivery_notes,
          total_in_pence,
          stripe_session_id,
          discount_code,
          discount_in_pence
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,$9,$10,$11
        )
        RETURNING *
      `,
      [
        customerName.trim(),
        customerEmail.trim(),
        customerPhone.trim(),
        deliveryAddress.trim(),
        deliveryCity.trim(),
        deliveryPostcode.trim(),
        deliveryNotes?.trim() || null,
        orderTotalInPence,
        payment.stripeSessionId || null,
        payment.discountCode || null,
        discountInPence,
      ],
    );

    const order = orderResult.rows[0];

    // Copy cart items to order_items
    for (const item of cartItems) {
      await client.query(
        `
          INSERT INTO order_items (
            order_id,
            product_id,
            product_name,
            variant_name,
            price_in_pence,
            quantity
          )
          VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [order.id, item.id, item.name, item.variant_name, item.price_in_pence, item.quantity],
      );
    }

    // Clear cart
    await client.query(
      `
        DELETE FROM cart_items
        WHERE cart_id = $1
      `,
      [cartId],
    );

    await client.query("COMMIT");

    return formatOrder(
      order,
      cartItems.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        variant_name: item.variant_name,
        price_in_pence: item.price_in_pence,
        quantity: item.quantity,
        image: item.image,
      })),
      true,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
