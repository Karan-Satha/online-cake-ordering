import pool from "../../db.js";

/**
 * Orders aren't linked by customer_id (checkout is guest-friendly and
 * doesn't require login) — a logged-in customer's history is matched by
 * email instead. This means orders placed as a guest, before creating an
 * account, automatically show up once they register with the same email.
 */
export async function getCustomerOrdersService(customerEmail) {
  const ordersResult = await pool.query(
    `
      SELECT
        id,
        total_in_pence AS "totalInPence",
        discount_code AS "discountCode",
        discount_in_pence AS "discountInPence",
        status,
        created_at AS "createdAt"
      FROM orders
      WHERE LOWER(customer_email) = LOWER($1)
      ORDER BY created_at DESC
    `,
    [customerEmail],
  );

  const orders = ordersResult.rows;

  if (orders.length === 0) {
    return [];
  }

  const orderIds = orders.map((order) => order.id);

  const itemsResult = await pool.query(
    `
      SELECT order_id AS "orderId", product_name AS "productName", price_in_pence AS "priceInPence", quantity
      FROM order_items
      WHERE order_id = ANY($1::int[])
      ORDER BY id
    `,
    [orderIds],
  );

  const itemsByOrderId = new Map();

  for (const item of itemsResult.rows) {
    if (!itemsByOrderId.has(item.orderId)) {
      itemsByOrderId.set(item.orderId, []);
    }

    itemsByOrderId.get(item.orderId).push({
      name: item.productName,
      priceInPence: item.priceInPence,
      quantity: item.quantity,
    });
  }

  return orders.map((order) => ({
    id: order.id,
    totalInPence: order.totalInPence,
    discountCode: order.discountCode,
    discountInPence: order.discountInPence,
    status: order.status,
    createdAt: order.createdAt,
    items: itemsByOrderId.get(order.id) || [],
  }));
}
