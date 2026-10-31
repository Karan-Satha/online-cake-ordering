import pool from "../../db.js";
import AppError from "../../utils/AppError.js";
import { getProductImageUrl } from "../storage/objectStorage.js";

async function getCartItems(cartId) {
  const result = await pool.query(
    `
      SELECT
        p.id,
        ci.id AS "cartItemId",
        p.name,
        p.description,
        COALESCE(pv.price_in_pence, p.price_in_pence) AS "priceInPence",
        p.old_price_in_pence AS "oldPriceInPence",
        p.image,
        ci.quantity,
        pv.id AS "variantId",
        pv.name AS "variantName",
        pv.servings
      FROM cart_items ci
      JOIN products p
        ON p.id = ci.product_id
      LEFT JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.cart_id = $1
      ORDER BY ci.id
    `,
    [cartId],
  );

  return result.rows.map((item) => ({ ...item, image: getProductImageUrl(item.image) }));
}

export async function getCartService(cartId) {
  return getCartItems(cartId);
}

export async function addCartItemService(cartId, productId, quantity, variantId = null) {
  const productResult = await pool.query(
    `
      SELECT p.id, EXISTS (SELECT 1 FROM product_variants WHERE product_id = p.id AND active = true) AS has_variants
      FROM products p WHERE p.id = $1
    `,
    [productId],
  );

  if (productResult.rows.length === 0) {
    throw new AppError("Product not found", 404);
  }

  if (variantId) {
    const variant = await pool.query(
      "SELECT id FROM product_variants WHERE id = $1 AND product_id = $2 AND active = true",
      [variantId, productId],
    );
    if (!variant.rows.length) throw new AppError("Please select an available size for this product", 400);
  } else if (productResult.rows[0].has_variants) {
    throw new AppError("Please select a size before adding this product to your basket", 400);
  }

  await pool.query(
    `
      INSERT INTO cart_items (
        cart_id,
        product_id,
        variant_id,
        quantity
      )
      VALUES ($1, $2, $3, $4)

      ON CONFLICT (cart_id, product_id, variant_id)

      DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity
    `,
    [cartId, productId, variantId, quantity],
  );

  return getCartItems(cartId);
}

export async function updateCartItemService(cartId, productId, quantity) {
  const result = await pool.query(
    `
      UPDATE cart_items
      SET quantity = $1
      WHERE cart_id = $2
        AND id = $3
      RETURNING id
    `,
    [quantity, cartId, productId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Cart item not found", 404);
  }

  return getCartItems(cartId);
}

export async function deleteCartItemService(cartId, productId) {
  const result = await pool.query(
    `
      DELETE FROM cart_items
      WHERE cart_id = $1
        AND id = $2
      RETURNING id
    `,
    [cartId, productId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Cart item not found", 404);
  }

  return getCartItems(cartId);
}
