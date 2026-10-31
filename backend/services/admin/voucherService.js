import pool from "../../db.js";

import AppError from "../../utils/AppError.js";

const CODE_REGEX = /^[A-Z0-9_-]{3,50}$/;

function normalizeCode(code) {
  return code?.trim().toUpperCase();
}

export async function getVouchersService() {
  const result = await pool.query(`
    SELECT
      id,
      code,
      discount_percent AS "discountPercent",
      is_active AS "isActive",
      created_at AS "createdAt"
    FROM voucher_codes
    ORDER BY created_at DESC
  `);

  return result.rows;
}

export async function getVoucherByIdService(voucherId) {
  const result = await pool.query(
    `
      SELECT
        id,
        code,
        discount_percent AS "discountPercent",
        is_active AS "isActive",
        created_at AS "createdAt"
      FROM voucher_codes
      WHERE id = $1
    `,
    [voucherId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Voucher not found", 404);
  }

  return result.rows[0];
}

function validateVoucherInput({ code, discountPercent }) {
  const normalizedCode = normalizeCode(code);

  if (!normalizedCode || !CODE_REGEX.test(normalizedCode)) {
    throw new AppError("Code must be 3-50 characters: letters, numbers, - or _ only", 400);
  }

  const percent = Number(discountPercent);

  if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
    throw new AppError("Discount must be a whole number between 1 and 100", 400);
  }

  return { code: normalizedCode, discountPercent: percent };
}

export async function createVoucherService(voucher) {
  const { code, discountPercent } = validateVoucherInput(voucher);

  const existing = await pool.query(`SELECT id FROM voucher_codes WHERE code = $1`, [code]);

  if (existing.rows.length > 0) {
    throw new AppError("A voucher with this code already exists", 409);
  }

  const result = await pool.query(
    `
      INSERT INTO voucher_codes (code, discount_percent, is_active)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        code,
        discount_percent AS "discountPercent",
        is_active AS "isActive",
        created_at AS "createdAt"
    `,
    [code, discountPercent, voucher.isActive !== false],
  );

  return result.rows[0];
}

export async function updateVoucherService(voucherId, voucher) {
  const { code, discountPercent } = validateVoucherInput(voucher);

  const existing = await pool.query(`SELECT id FROM voucher_codes WHERE code = $1 AND id != $2`, [code, voucherId]);

  if (existing.rows.length > 0) {
    throw new AppError("A voucher with this code already exists", 409);
  }

  const result = await pool.query(
    `
      UPDATE voucher_codes
      SET code = $1, discount_percent = $2, is_active = $3
      WHERE id = $4
      RETURNING
        id,
        code,
        discount_percent AS "discountPercent",
        is_active AS "isActive",
        created_at AS "createdAt"
    `,
    [code, discountPercent, Boolean(voucher.isActive), voucherId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Voucher not found", 404);
  }

  return result.rows[0];
}

export async function deleteVoucherService(voucherId) {
  const result = await pool.query(
    `
      DELETE FROM voucher_codes
      WHERE id = $1
      RETURNING id
    `,
    [voucherId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Voucher not found", 404);
  }

  return { message: "Voucher deleted successfully" };
}
