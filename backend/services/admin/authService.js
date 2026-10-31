import pool from "../../db.js";
import bcrypt from "bcrypt";

import AppError from "../../utils/AppError.js";
import { createAdminToken } from "../../utils/jwt.js";

export async function loginAdminService(email, password) {
  if (!email?.trim() || !password?.trim()) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash
      FROM admins
      WHERE LOWER(email) = $1
    `,
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  const admin = result.rows[0];

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = createAdminToken(admin.id);

  return {
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
    },
    token,
  };
}

export async function getCurrentAdminService(adminId) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        email
      FROM admins
      WHERE id = $1
    `,
    [adminId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Admin not found", 404);
  }

  return result.rows[0];
}
