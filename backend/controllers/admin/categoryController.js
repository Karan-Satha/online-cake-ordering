import asyncHandler from "../../middleware/asyncHandler.js";

import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
} from "../../services/admin/categoryService.js";

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await getCategoriesService();

  res.json(categories);
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await getCategoryByIdService(Number(req.params.id));

  res.json(category);
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await createCategoryService(req.body);

  res.status(201).json(category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await updateCategoryService(Number(req.params.id), req.body);

  res.json(category);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const result = await deleteCategoryService(Number(req.params.id));

  res.json(result);
});
