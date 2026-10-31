import crypto from "node:crypto";
import bcrypt from "bcrypt";

import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { createCustomerToken } from "../../utils/jwt.js";
import { sendEmail } from "../email/emailClient.js";
import { buildPasswordResetEmail } from "../email/templates/passwordReset.js";
import { config } from "../../config/index.js";
import { logger } from "../../utils/logger.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function formatCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
  };
}

export async function registerCustomerService({ name, email, password }) {
  const trimmedName = name?.trim();
  const trimmedEmail = email?.trim().toLowerCase();

  if (!trimmedName) {
    throw new AppError("Please enter your name", 400);
  }

  if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  if (!password || password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const existing = await pool.query(`SELECT id FROM customers WHERE LOWER(email) = $1`, [trimmedEmail]);

  if (existing.rows.length > 0) {
    throw new AppError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
      INSERT INTO customers (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
    `,
    [trimmedName, trimmedEmail, passwordHash],
  );

  const customer = result.rows[0];
  const token = createCustomerToken(customer.id);

  return { customer: formatCustomer(customer), token };
}

export async function loginCustomerService(email, password) {
  if (!email?.trim() || !password?.trim()) {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT id, name, email, password_hash
      FROM customers
      WHERE LOWER(email) = $1
    `,
    [normalizedEmail],
  );

  if (result.rows.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  const customer = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, customer.password_hash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const token = createCustomerToken(customer.id);

  return { customer: formatCustomer(customer), token };
}

export async function getCurrentCustomerService(customerId) {
  const result = await pool.query(`SELECT id, name, email FROM customers WHERE id = $1`, [customerId]);

  if (result.rows.length === 0) {
    throw new AppError("Account not found", 404);
  }

  return formatCustomer(result.rows[0]);
}

/**
 * Validates the email and checks whether it belongs to a registered
 * account, throwing a specific error either way (invalid format vs. no
 * matching account) so the frontend can show real, distinct feedback.
 *
 * Trade-off worth knowing: this lets someone probe which email addresses
 * have accounts here (the previous version always returned the same
 * generic "if that email has an account…" message specifically to prevent
 * that). Implemented this way because it was explicitly requested — if you
 * ever want the more private behavior back, this is the function to revert.
 */
export async function requestPasswordResetService(email) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    throw new AppError("Please enter a valid email address", 400);
  }

  const result = await pool.query(`SELECT id, name, email FROM customers WHERE LOWER(email) = $1`, [normalizedEmail]);

  const customer = result.rows[0];

  if (!customer) {
    throw new AppError("No account was found with that email address", 404);
  }

  const resetToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    `
      UPDATE customers
      SET reset_token = $1, reset_token_expires_at = $2
      WHERE id = $3
    `,
    [resetToken, expiresAt, customer.id],
  );

  const resetUrl = new URL(`/reset-password?token=${resetToken}`, config.frontendUrl).toString();

  const resetEmail = buildPasswordResetEmail({ name: customer.name, resetUrl });
  const sendResult = await sendEmail({
    to: customer.email,
    subject: resetEmail.subject,
    html: resetEmail.html,
    text: resetEmail.text,
  });

  if (!sendResult.success) {
    logger.error(`Password reset email failed for customer #${customer.id}: ${sendResult.error}`);
  }
}

export async function resetPasswordService(token, newPassword) {
  if (!token) {
    throw new AppError("Missing reset token", 400);
  }

  if (!newPassword || newPassword.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }

  const result = await pool.query(
    `
      SELECT id
      FROM customers
      WHERE reset_token = $1
        AND reset_token_expires_at > NOW()
    `,
    [token],
  );

  const customer = result.rows[0];

  if (!customer) {
    throw new AppError("This reset link is invalid or has expired", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await pool.query(
    `
      UPDATE customers
      SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL
      WHERE id = $2
    `,
    [passwordHash, customer.id],
  );

  const newToken = createCustomerToken(customer.id);

  return { token: newToken };
}
