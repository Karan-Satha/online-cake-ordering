import crypto from "node:crypto";
import pool from "../db.js";
import { config } from "../config/index.js";

export async function getOrCreateCart(req, res, next) {
  try {
    let cartToken = req.cookies.cartToken;

    if (cartToken) {
      const result = await pool.query(
        `
          SELECT id
          FROM carts
          WHERE token = $1
        `,
        [cartToken],
      );

      if (result.rows.length > 0) {
        req.cartId = result.rows[0].id;

        return next();
      }
    }

    cartToken = crypto.randomUUID();

    const result = await pool.query(
      `
        INSERT INTO carts (token)
        VALUES ($1)
        RETURNING id
      `,
      [cartToken],
    );

    req.cartId = result.rows[0].id;

    res.cookie("cartToken", cartToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.nodeEnv === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });

    next();
  } catch (error) {
    console.error("Cart middleware error:", error);

    res.status(500).json({
      error: "Could not create cart",
    });
  }
}
