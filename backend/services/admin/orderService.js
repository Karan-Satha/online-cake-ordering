import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { ORDER_STATUS } from "../../constants/orderStatus.js";

const ALLOWED_ORDER_STATUSES = Object.values(ORDER_STATUS);

export async function getOrdersService(page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  const [ordersResult, countResult] = await Promise.all([
    pool.query(
      `
      SELECT
        id,
        customer_name AS "customerName",
        customer_email AS "customerEmail",
        customer_phone AS "customerPhone",
        delivery_address AS "deliveryAddress",
        delivery_city AS "deliveryCity",
        delivery_postcode AS "deliveryPostcode",
        delivery_notes AS "deliveryNotes",
        total_in_pence AS "totalInPence",
        status,
        created_at AS "createdAt"
      FROM orders
      ORDER BY created_at DESC
      LIMIT $1
      OFFSET $2
      `,
      [limit, offset],
    ),

    pool.query(`
      SELECT COUNT(*)::int AS count
      FROM orders
    `),
  ]);

  const totalOrders = countResult.rows[0].count;

  return {
    orders: ordersResult.rows,
    currentPage: page,
    totalPages: Math.ceil(totalOrders / limit),
    totalOrders,
  };
}

export async function getOrderByIdService(orderId) {
  if (!Number.isInteger(orderId) || orderId < 1) {
    throw new AppError("Invalid order ID", 400);
  }

  const orderResult = await pool.query(
    `
      SELECT
        id,
        customer_name AS "customerName",
        customer_email AS "customerEmail",
        customer_phone AS "customerPhone",
        delivery_address AS "deliveryAddress",
        delivery_city AS "deliveryCity",
        delivery_postcode AS "deliveryPostcode",
        delivery_notes AS "deliveryNotes",
        total_in_pence AS "totalInPence",
        status,
        created_at AS "createdAt"
      FROM orders
      WHERE id = $1
    `,
    [orderId],
  );

  if (orderResult.rows.length === 0) {
    throw new AppError("Order not found", 404);
  }

  const itemsResult = await pool.query(
    `
      SELECT
        id,
        product_id AS "productId",
        product_name AS "productName",
        variant_name AS "variantName",
        price_in_pence AS "priceInPence",
        quantity
      FROM order_items
      WHERE order_id = $1
      ORDER BY id
    `,
    [orderId],
  );

  return {
    ...orderResult.rows[0],
    items: itemsResult.rows,
  };
}

export async function updateOrderStatusService(orderId, status) {
  if (!Number.isInteger(orderId) || orderId < 1) {
    throw new AppError("Invalid order ID", 400);
  }

  if (!ALLOWED_ORDER_STATUSES.includes(status)) {
    throw new AppError("Invalid order status", 400);
  }

  const result = await pool.query(
    `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING
        id,
        status
    `,
    [status, orderId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Order not found", 404);
  }

  return result.rows[0];
}
