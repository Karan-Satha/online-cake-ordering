import pool from "../../db.js";

export async function getDashboardStatsService() {
  const [
    ordersResult,
    productsResult,
    revenueResult,
    pendingResult,
    recentOrdersResult,
  ] = await Promise.all([
    pool.query(`
      SELECT COUNT(*)::int AS count
      FROM orders
    `),

    pool.query(`
      SELECT COUNT(*)::int AS count
      FROM products
    `),

    pool.query(`
      SELECT COALESCE(
        SUM(total_in_pence),
        0
      )::int AS revenue
      FROM orders
    `),

    pool.query(`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE status = 'pending'
    `),

    pool.query(`
      SELECT
        id,
        customer_name AS "customerName",
        status,
        total_in_pence AS "totalInPence",
        created_at AS "createdAt"
      FROM orders
      ORDER BY created_at DESC
      LIMIT 5
    `),
  ]);

  return {
    orders: ordersResult.rows[0].count,
    products: productsResult.rows[0].count,
    pendingOrders: pendingResult.rows[0].count,
    revenueInPence: revenueResult.rows[0].revenue,
    recentOrders: recentOrdersResult.rows,
  };
}
