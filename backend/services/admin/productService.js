import pool from "../../db.js";
import path from "path";
import AppError from "../../utils/AppError.js";
import { invalidateAll as invalidateProductCache } from "../shop/productCache.js";
import { getProductImageUrl } from "../storage/objectStorage.js";

const PRODUCT_FIELDS = `
  p.id, p.name, p.description,
  p.price_in_pence AS "priceInPence",
  p.old_price_in_pence AS "oldPriceInPence",
  p.image, p.image_gallery AS "imageGallery", p.featured,
  p.stock_quantity AS "stockQuantity",
  p.category_id AS "categoryId", c.name AS "categoryName",
  p.ingredients, p.allergens, p.allergy_advice AS "allergyAdvice",
  p.storage_instructions AS "storageInstructions", p.shelf_life AS "shelfLife",
  p.nutrition
`;

function validateProduct(product) {
  if (typeof product.name !== "string" || !product.name.trim()) throw new AppError("Product name is required", 400);
  const price = Number(product.priceInPence);
  if (!Number.isInteger(price) || price < 0) throw new AppError("Invalid price", 400);
  if (product.oldPriceInPence != null && (!Number.isInteger(Number(product.oldPriceInPence)) || Number(product.oldPriceInPence) < 0)) throw new AppError("Invalid original price", 400);
  if (!Number.isInteger(Number(product.stockQuantity)) || Number(product.stockQuantity) < 0) throw new AppError("Stock quantity must be a non-negative whole number", 400);
  for (const field of ["description", "ingredients", "allergens", "allergyAdvice", "storageInstructions", "shelfLife"]) {
    if (product[field] != null && typeof product[field] !== "string") throw new AppError(`Invalid ${field}`, 400);
    if (product[field]?.length > 10000) throw new AppError(`${field} is too long`, 400);
  }
  if (product.nutrition != null) validateNutrition(product.nutrition);
  if (!Array.isArray(product.imageGallery) || product.imageGallery.length > 8 || product.imageGallery.some((image) => typeof image !== "string" || image.length > 255)) {
    throw new AppError("A product can have up to 8 additional gallery images", 400);
  }
  if (!Array.isArray(product.variants)) throw new AppError("Invalid product sizes", 400);
  if (product.variants.length > 20) throw new AppError("A product can have up to 20 sizes", 400);
  const names = new Set();
  product.variants.forEach((variant) => {
    if (!variant || typeof variant !== "object" || typeof variant.name !== "string" || !variant.name.trim() || variant.name.trim().length > 100) throw new AppError("Each size needs a name (up to 100 characters)", 400);
    const key = variant.name.trim().toLowerCase();
    if (names.has(key)) throw new AppError("Size names must be unique per product", 400);
    names.add(key);
    if (!Number.isInteger(Number(variant.priceInPence)) || Number(variant.priceInPence) < 0) throw new AppError(`Invalid price for ${variant.name}`, 400);
    if (variant.servings != null && variant.servings !== "" && (!Number.isInteger(Number(variant.servings)) || Number(variant.servings) < 1)) {
      throw new AppError(`Invalid servings for ${variant.name}`, 400);
    }
    if (variant.details != null && (typeof variant.details !== "string" || variant.details.length > 2000)) throw new AppError(`Invalid details for ${variant.name}`, 400);
  });
}

function validateNutrition(nutrition) {
  if (!nutrition || typeof nutrition !== "object" || Array.isArray(nutrition)) throw new AppError("Invalid nutrition data", 400);
  for (const basis of ["per100g", "perPortion"]) {
    const values = nutrition[basis];
    if (values == null) continue;
    if (typeof values !== "object" || Array.isArray(values)) throw new AppError("Invalid nutrition data", 400);
    for (const field of ["energyKcal", "energyKj", "fat", "saturates", "carbohydrates", "sugars", "protein", "salt"]) {
      if (values[field] != null && (!Number.isFinite(Number(values[field])) || Number(values[field]) < 0)) {
        throw new AppError(`Invalid nutrition value: ${field}`, 400);
      }
    }
  }
}

function parseProduct(product) {
  let nutrition = product.nutrition;
  try {
    if (typeof nutrition === "string") nutrition = JSON.parse(nutrition);
  } catch {
    throw new AppError("Nutrition data must be valid JSON", 400);
  }
  let variants = product.variants;
  try {
    if (typeof variants === "string") variants = JSON.parse(variants || "[]");
  } catch {
    throw new AppError("Product sizes must be valid JSON", 400);
  }
  const imageGallery = Array.isArray(product.imageGallery) ? product.imageGallery.map((image) => path.basename(image.replace(/^\/uploads\/products\//, ""))) : [];
  return {
    ...product,
    priceInPence: Number(product.priceInPence),
    oldPriceInPence: product.oldPriceInPence == null || product.oldPriceInPence === "" ? null : Number(product.oldPriceInPence),
    stockQuantity: Number(product.stockQuantity ?? 20),
    categoryId: Number(product.categoryId) || null,
    image: product.image?.trim() || null,
    description: product.description?.trim() || null,
    ingredients: product.ingredients?.trim() || null,
    allergens: product.allergens?.trim() || null,
    allergyAdvice: product.allergyAdvice?.trim() || null,
    storageInstructions: product.storageInstructions?.trim() || null,
    shelfLife: product.shelfLife?.trim() || null,
    nutrition: nutrition && Object.keys(nutrition).length ? nutrition : null,
    imageGallery: imageGallery.filter(Boolean),
    variants: Array.isArray(variants) ? variants : [],
  };
}

async function getVariants(productId, query = pool.query.bind(pool)) {
  const result = await query(
    `SELECT id, name, servings, price_in_pence AS "priceInPence", details, position
     FROM product_variants WHERE product_id = $1 AND active = true ORDER BY position, id`,
    [productId],
  );
  return result.rows;
}

export async function getProductsService() {
  const result = await pool.query(`SELECT ${PRODUCT_FIELDS} FROM products p LEFT JOIN categories c ON c.id = p.category_id ORDER BY p.id`);
  return Promise.all(result.rows.map(async (product) => ({
    ...product,
    image: getProductImageUrl(product.image),
    imageGallery: (product.imageGallery || []).map((image) => getProductImageUrl(image)),
    variants: await getVariants(product.id),
  })));
}

async function saveVariants(query, productId, variants) {
  await query("UPDATE product_variants SET active = false, updated_at = now() WHERE product_id = $1", [productId]);
  for (const [position, variant] of variants.entries()) {
    const values = [productId, variant.name.trim(), variant.servings ? Number(variant.servings) : null, Number(variant.priceInPence), variant.details?.trim() || null, position];
    if (Number.isInteger(Number(variant.id)) && Number(variant.id) > 0) {
      const result = await query(
        `UPDATE product_variants SET name=$2, servings=$3, price_in_pence=$4, details=$5, position=$6, active=true, updated_at=now()
         WHERE product_id=$1 AND id=$7 RETURNING id`,
        [...values, Number(variant.id)],
      );
      if (result.rowCount) continue;
    }
    await query(
      `INSERT INTO product_variants (product_id, name, servings, price_in_pence, details, position, active)
       VALUES ($1,$2,$3,$4,$5,$6,true)
       ON CONFLICT (product_id, name) DO UPDATE SET servings=EXCLUDED.servings, price_in_pence=EXCLUDED.price_in_pence,
         details=EXCLUDED.details, position=EXCLUDED.position, active=true, updated_at=now()`,
      values,
    );
  }
}

const PRODUCT_COLUMN_NAMES = `name, description, price_in_pence, old_price_in_pence, stock_quantity, image, image_gallery, category_id,
  ingredients, allergens, allergy_advice, storage_instructions, shelf_life, nutrition`;
const PRODUCT_PLACEHOLDERS = `$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14`;

function productValues(product) {
  return [product.name.trim(), product.description, product.priceInPence, product.oldPriceInPence,
    product.stockQuantity, product.image, product.imageGallery, product.categoryId, product.ingredients, product.allergens,
    product.allergyAdvice, product.storageInstructions, product.shelfLife,
    product.nutrition ? JSON.stringify(product.nutrition) : null];
}

export async function createProductService(input) {
  const product = parseProduct(input);
  validateProduct(product);
  if (!product.image) throw new AppError("Product image is required", 400);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(`INSERT INTO products (${PRODUCT_COLUMN_NAMES}) VALUES (${PRODUCT_PLACEHOLDERS}) RETURNING id`, productValues(product));
    await saveVariants(client.query.bind(client), result.rows[0].id, product.variants);
    await client.query("COMMIT");
    invalidateProductCache();
    return getProductByIdService(result.rows[0].id);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateProductService(productId, input) {
  const product = parseProduct(input);
  validateProduct(product);
  if (!product.image) throw new AppError("Product image is required", 400);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE products SET name=$1, description=$2, price_in_pence=$3, old_price_in_pence=$4, stock_quantity=$5,
       image=$6, image_gallery=$7, category_id=$8, ingredients=$9, allergens=$10, allergy_advice=$11,
       storage_instructions=$12, shelf_life=$13, nutrition=$14 WHERE id=$15 RETURNING id`,
      [...productValues(product), productId],
    );
    if (!result.rowCount) throw new AppError("Product not found", 404);
    await saveVariants(client.query.bind(client), productId, product.variants);
    await client.query("COMMIT");
    invalidateProductCache();
    return getProductByIdService(productId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getProductByIdService(productId) {
  const result = await pool.query(
    `SELECT ${PRODUCT_FIELDS} FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = $1`,
    [productId],
  );
  if (!result.rows.length) throw new AppError("Product not found", 404);
  const product = result.rows[0];
  return { ...product, image: getProductImageUrl(product.image), imageGallery: (product.imageGallery || []).map((image) => getProductImageUrl(image)), variants: await getVariants(productId) };
}

export async function deleteProductService(productId) {
  const result = await pool.query("DELETE FROM products WHERE id = $1 RETURNING id", [productId]);
  if (!result.rows.length) throw new AppError("Product not found", 404);
  invalidateProductCache();
  return { message: "Product deleted successfully" };
}
