import Stripe from "stripe";

import { config } from "../../config/index.js";
import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { getOrderByStripeSessionId } from "./orderService.js";
import { completeCheckoutSessionAndNotify } from "./checkoutCompletionService.js";
import { getActiveVoucher, calculateDiscountInPence } from "./voucherService.js";

export const FREE_DELIVERY_THRESHOLD_IN_PENCE = 5000;
export const DELIVERY_FEE_IN_PENCE = Number(process.env.DELIVERY_FEE_IN_PENCE || 500);

export function getDeliveryFeeInPence(subtotalInPence) {
  return subtotalInPence < FREE_DELIVERY_THRESHOLD_IN_PENCE ? DELIVERY_FEE_IN_PENCE : 0;
}

function getStripe() {
  if (!config.stripeSecretKey) {
    throw new AppError("Online payments are not configured yet. Please try again later.", 503);
  }

  return new Stripe(config.stripeSecretKey);
}

async function getCartItems(cartId) {
  const result = await pool.query(
    `
      SELECT p.id, p.name, COALESCE(pv.price_in_pence, p.price_in_pence) AS price_in_pence,
        CASE WHEN pv.name IS NULL THEN p.name ELSE p.name || ' — ' || pv.name END AS name,
        ci.quantity
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.cart_id = $1
      ORDER BY ci.id
    `,
    [cartId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Your basket is empty", 400);
  }

  return result.rows;
}

function getCheckoutUrl(pathname) {
  return new URL(pathname, `${config.frontendUrl.replace(/\/$/, "")}/`).toString();
}

export async function createCheckoutSession(cartId, customer) {
  const cartItems = await getCartItems(cartId);
  const subtotalInPence = cartItems.reduce((total, item) => total + item.price_in_pence * item.quantity, 0);
  // Free-delivery threshold is based on the original subtotal, not the
  // discounted one — otherwise a voucher could unexpectedly push someone
  // below the threshold and add a delivery charge they didn't expect.
  const deliveryFeeInPence = getDeliveryFeeInPence(subtotalInPence);
  const stripe = getStripe();

  const voucher = await getActiveVoucher(customer.discountCode);
  const discountInPence = voucher ? calculateDiscountInPence(subtotalInPence, voucher.discountPercent) : 0;

  const lineItems = cartItems.map((item) => ({
    price_data: {
      currency: "gbp",
      product_data: { name: item.name },
      unit_amount: item.price_in_pence,
    },
    quantity: item.quantity,
  }));

  if (deliveryFeeInPence > 0) {
    lineItems.push({
      price_data: {
        currency: "gbp",
        product_data: { name: "Local delivery" },
        unit_amount: deliveryFeeInPence,
      },
      quantity: 1,
    });
  }

  let discounts;

  if (voucher) {
    // An ephemeral, one-time coupon rather than a permanent Stripe object —
    // this keeps the discount fully self-contained in code (no manual
    // Stripe Dashboard setup required) while still showing natively on
    // Stripe's hosted checkout page and being reflected in
    // session.amount_total, which is what makes it actually enforced
    // rather than just a display trick.
    const coupon = await stripe.coupons.create({
      percent_off: voucher.discountPercent,
      duration: "once",
      name: voucher.code,
    });

    discounts = [{ coupon: coupon.id }];
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    client_reference_id: String(cartId),
    customer_email: customer.customerEmail.trim(),
    line_items: lineItems,
    ...(discounts ? { discounts } : {}),
    metadata: {
      customerName: customer.customerName.trim(),
      customerEmail: customer.customerEmail.trim(),
      customerPhone: customer.customerPhone.trim(),
      deliveryAddress: customer.deliveryAddress.trim(),
      deliveryCity: customer.deliveryCity.trim(),
      deliveryPostcode: customer.deliveryPostcode.trim(),
      deliveryNotes: customer.deliveryNotes?.trim() || "",
      deliveryFeeInPence: String(deliveryFeeInPence),
      discountCode: voucher?.code || "",
      discountInPence: String(discountInPence),
    },
    success_url: `${getCheckoutUrl("checkout/confirmation")}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: getCheckoutUrl("checkout"),
  });

  await pool.query(
    `
    INSERT INTO checkout_sessions (
      cart_id,
      stripe_session_id,
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      delivery_city,
      delivery_postcode,
      delivery_notes,
      marketing_opt_in,
      discount_code,
      discount_in_pence,
      status
    )
    VALUES (
      $1,$2,$3,$4,$5,
      $6,$7,$8,$9,$10,$11,$12,'pending'
    )
  `,
    [
      cartId,
      session.id,
      customer.customerName.trim(),
      customer.customerEmail.trim(),
      customer.customerPhone.trim(),
      customer.deliveryAddress.trim(),
      customer.deliveryCity.trim(),
      customer.deliveryPostcode.trim(),
      customer.deliveryNotes?.trim() || "",
      Boolean(customer.marketingOptIn),
      voucher?.code || null,
      discountInPence,
    ],
  );

  return { url: session.url };
}

/**
 * Looks up the order for a completed Stripe checkout session, completing
 * it right here as a fallback if the webhook hasn't gotten to it yet.
 *
 * The Stripe webhook (checkout.session.completed) is still the primary,
 * authoritative trigger — it's the only signal guaranteed to fire even if
 * the customer's browser never makes it back here (closed tab, dropped
 * connection, etc). But relying on it exclusively means this page's
 * correctness depends on webhook delivery timing, which can be slow, or
 * in local development without `stripe listen` forwarding, may never
 * happen at all. So: if no order exists yet by the time this is called,
 * verify payment with Stripe directly and complete the session ourselves.
 * This is safe to race against the webhook — completeCheckoutSessionAndNotify
 * dedupes on stripe_session_id, so whichever call (webhook or this one)
 * runs first "wins"; the other just returns the same order without
 * creating a duplicate or sending a second email.
 */
export async function getOrderForSession(cartId, sessionId) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid" || session.client_reference_id !== String(cartId)) {
    throw new AppError("We could not verify this payment", 400);
  }

  const existingOrder = await getOrderByStripeSessionId(sessionId);

  if (existingOrder) {
    return existingOrder;
  }

  const checkoutSessionResult = await pool.query(
    `
      SELECT *
      FROM checkout_sessions
      WHERE stripe_session_id = $1
      LIMIT 1
    `,
    [sessionId],
  );

  const checkoutSession = checkoutSessionResult.rows[0];

  if (!checkoutSession) {
    throw new AppError("We could not find this checkout session", 404);
  }

  return completeCheckoutSessionAndNotify(checkoutSession, session);
}
