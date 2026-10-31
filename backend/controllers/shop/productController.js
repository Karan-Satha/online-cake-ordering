import asyncHandler from "../../middleware/asyncHandler.js";

import {
  getProductsService,
  getCategoriesService,
  getFeaturedProductsService,
  getProductByIdService,
  getRelatedProductsService,
} from "../../services/shop/productService.js";

export const getProducts = asyncHandler(async (req, res) => {
  const products = await getProductsService({
    search: req.query.search,
    category: req.query.category,
    sort: req.query.sort,
  });

  res.json(products);
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await getCategoriesService();

  res.json(categories);
});

export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await getFeaturedProductsService();

  res.json(products);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await getProductByIdService(req.params.id);

  if (!product) {
    return res.status(404).json({
      message: "Product not found",
    });
  }

  res.json(product);
});

export const getRelatedProducts = asyncHandler(async (req, res) => {
  const products = await getRelatedProductsService(Number(req.params.id));

  res.json(products);
});
