import pool from "../../db.js";

import AppError from "../../utils/AppError.js";
import { invalidateAll as invalidateProductCache } from "../shop/productCache.js";

export async function getCategoriesService() {
  const result = await pool.query(`
    SELECT
      id,
      name,
      slug
    FROM categories
    ORDER BY name
  `);

  return result.rows;
}

export async function getCategoryByIdService(categoryId) {
  const result = await pool.query(
    `
      SELECT
        id,
        name,
        slug
      FROM categories
      WHERE id = $1
    `,
    [categoryId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Category not found", 404);
  }

  return result.rows[0];
}

export async function createCategoryService(category) {
  const { name, slug } = category;

  if (!name?.trim()) {
    throw new AppError("Category name is required", 400);
  }

  if (!slug?.trim()) {
    throw new AppError("Category slug is required", 400);
  }

  const result = await pool.query(
    `
      INSERT INTO categories
      (
        name,
        slug
      )
      VALUES
      (
        $1,
        $2
      )
      RETURNING
        id,
        name,
        slug
    `,
    [name.trim(), slug.trim().toLowerCase()],
  );

  invalidateProductCache();

  return result.rows[0];
}

export async function updateCategoryService(categoryId, category) {
  const { name, slug } = category;

  const result = await pool.query(
    `
      UPDATE categories
      SET
        name = $1,
        slug = $2
      WHERE id = $3
      RETURNING
        id,
        name,
        slug
    `,
    [name.trim(), slug.trim().toLowerCase(), categoryId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Category not found", 404);
  }

  invalidateProductCache();

  return result.rows[0];
}

export async function deleteCategoryService(categoryId) {
  const products = await pool.query(
    `
      SELECT id
      FROM products
      WHERE category_id = $1
      LIMIT 1
    `,
    [categoryId],
  );

  if (products.rows.length > 0) {
    throw new AppError("Cannot delete category while products are assigned.", 400);
  }

  const result = await pool.query(
    `
      DELETE FROM categories
      WHERE id = $1
      RETURNING id
    `,
    [categoryId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Category not found", 404);
  }

  invalidateProductCache();

  return {
    message: "Category deleted successfully",
  };
}
