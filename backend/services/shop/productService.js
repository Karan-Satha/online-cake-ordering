import pool from "../../db.js";
import { getCached } from "./productCache.js";
import { getProductImageUrl } from "../storage/objectStorage.js";

const BESTSELLER_CTES = `
  WITH paid_orders AS (
    SELECT DISTINCT o.id
    FROM orders o
    JOIN checkout_sessions cs ON cs.stripe_session_id = o.stripe_session_id
    WHERE cs.status = 'completed'
      AND o.stripe_session_id IS NOT NULL
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND LOWER(BTRIM(o.status)) NOT IN ('cancelled', 'canceled', 'failed', 'unpaid', 'refunded', 'void', 'payment_failed')
  ),
  product_sales AS (
    SELECT oi.product_id, COUNT(DISTINCT po.id)::int AS order_count, SUM(oi.quantity)::int AS units_sold
    FROM paid_orders po
    JOIN order_items oi ON oi.order_id = po.id
    WHERE oi.product_id IS NOT NULL
    GROUP BY oi.product_id
  ),
  ranked_sales AS (
    SELECT product_id, order_count, units_sold,
      ROW_NUMBER() OVER (ORDER BY units_sold DESC, order_count DESC, product_id) AS sales_rank
    FROM product_sales
    WHERE order_count >= 3
  )
`;

const BESTSELLER_SELECT = `COALESCE(rs.sales_rank <= 5, false) AS "isBestseller"`;

async function getVariants(productId) {
  const result = await pool.query(
    `SELECT id, name, servings, price_in_pence AS "priceInPence", details, position
     FROM product_variants WHERE product_id = $1 AND active = true ORDER BY position, id`,
    [productId],
  );
  return result.rows;
}

export async function getProductsService({ search = "", category = "", sort = "" } = {}) {
  const cacheKey = `products:${search}:${category}:${sort}`;

  return getCached(cacheKey, () => fetchProducts({ search, category, sort }));
}

async function fetchProducts({ search, category, sort }) {
  let query = `
    ${BESTSELLER_CTES}
    SELECT
      p.id,
      p.name,
      p.description,
      p.price_in_pence AS "priceInPence",
      p.old_price_in_pence AS "oldPriceInPence",
      p.image,
      p.featured,
      p.stock_quantity AS "stockQuantity",
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      ${BESTSELLER_SELECT}
    FROM products p
    LEFT JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN ranked_sales rs ON rs.product_id = p.id
    WHERE 1=1
  `;

  const values = [];

  if (search) {
    values.push(`%${search}%`);

    query += `
      AND p.name ILIKE $${values.length}
    `;
  }

  if (category) {
    values.push(category);

    query += `
      AND c.slug = $${values.length}
    `;
  }

  switch (sort) {
    case "price-asc":
      query += `
        ORDER BY p.price_in_pence ASC
      `;
      break;

    case "price-desc":
      query += `
        ORDER BY p.price_in_pence DESC
      `;
      break;

    case "name":
      query += `
        ORDER BY p.name
      `;
      break;

    default:
      query += `
        ORDER BY p.id
      `;
  }

  const result = await pool.query(query, values);

  return Promise.all(result.rows.map(async (product) => ({
    ...product,
    image: getProductImageUrl(product.image),
    variants: await getVariants(product.id),
  })));
}

export async function getCategoriesService() {
  return getCached("categories", async () => {
    const result = await pool.query(`
      SELECT
        id,
        name,
        slug
      FROM categories
      ORDER BY name
    `);

    return result.rows;
  });
}

export async function getFeaturedProductsService() {
  return getCached("featured-products", async () => {
    const result = await pool.query(`
      ${BESTSELLER_CTES}
      SELECT *
      FROM (
        SELECT
          p.id,
          p.name,
          p.description,
          p.price_in_pence AS "priceInPence",
          p.old_price_in_pence AS "oldPriceInPence",
          p.image,
          p.featured,
          ${BESTSELLER_SELECT},
          p.category_id AS "categoryId",
          c.name AS "categoryName",
          ROW_NUMBER() OVER (
            PARTITION BY p.category_id
            ORDER BY RANDOM()
          ) AS rn
        FROM products p
        LEFT JOIN categories c
          ON c.id = p.category_id
        LEFT JOIN ranked_sales rs ON rs.product_id = p.id
        WHERE p.featured = true
      ) featured_products
      WHERE rn <= 2
      ORDER BY "categoryId";
    `);

    return result.rows.map((product) => ({ ...product, image: getProductImageUrl(product.image) }));
  });
}

export async function getRelatedProductsService(productId) {
  const result = await pool.query(
    `
    ${BESTSELLER_CTES}
    SELECT
      p.id,
      p.name,
      p.description,
      p.price_in_pence AS "priceInPence",
      p.old_price_in_pence AS "oldPriceInPence",
      p.image,
      p.featured,
      ${BESTSELLER_SELECT},
      p.stock_quantity AS "stockQuantity",
      p.category_id AS "categoryId",
      c.name AS "categoryName"
    FROM products p
    JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN ranked_sales rs ON rs.product_id = p.id
    WHERE p.category_id = (
      SELECT category_id
      FROM products
      WHERE id = $1
    )
    AND p.id <> $1
    ORDER BY RANDOM()
    LIMIT 4
    `,
    [productId],
  );

  return result.rows.map((product) => ({ ...product, image: getProductImageUrl(product.image) }));
}

export async function getProductByIdService(id) {
  const result = await pool.query(
    `
    ${BESTSELLER_CTES}
    SELECT
      p.id,
      p.name,
      p.description,
      p.price_in_pence AS "priceInPence",
      p.old_price_in_pence AS "oldPriceInPence",
      p.image,
      p.featured,
      ${BESTSELLER_SELECT},
      p.stock_quantity AS "stockQuantity",
      p.category_id AS "categoryId",
      c.name AS "categoryName",
      c.slug AS "categorySlug",
      p.ingredients, p.allergens, p.allergy_advice AS "allergyAdvice",
      p.storage_instructions AS "storageInstructions", p.shelf_life AS "shelfLife",
      p.nutrition, p.image_gallery AS "imageGallery"
    FROM products p
    LEFT JOIN categories c
      ON c.id = p.category_id
    LEFT JOIN ranked_sales rs ON rs.product_id = p.id
    WHERE p.id = $1
    `,
    [id],
  );

  if (!result.rows[0]) return null;
  const product = result.rows[0];
  return {
    ...product,
    image: getProductImageUrl(product.image),
    imageGallery: (product.imageGallery || []).map((image) => getProductImageUrl(image)),
    variants: await getVariants(id),
  };
}
