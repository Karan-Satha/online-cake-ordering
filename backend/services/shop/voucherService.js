import pool from "../../db.js";

/**
 * Looks up a voucher code and returns its discount if valid and active,
 * or null if not — deliberately never throws. A stale or mistyped code
 * (e.g. one auto-applied from localStorage weeks after the newsletter
 * signup) should just silently not apply a discount, not break checkout.
 */
export async function getActiveVoucher(code) {
  const normalizedCode = code?.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const result = await pool.query(
    `
      SELECT code, discount_percent AS "discountPercent"
      FROM voucher_codes
      WHERE code = $1
        AND is_active = TRUE
    `,
    [normalizedCode],
  );

  return result.rows[0] || null;
}

export function calculateDiscountInPence(subtotalInPence, discountPercent) {
  return Math.round((subtotalInPence * discountPercent) / 100);
}
