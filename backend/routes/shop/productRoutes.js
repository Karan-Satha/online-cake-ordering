import express from "express";

import {
  getProducts,
  getCategories,
  getFeaturedProducts,
  getProductById,
  getRelatedProducts,
} from "../../controllers/shop/productController.js";

const router = express.Router();

// GET /api/products
router.get("/", getProducts);

// GET /api/products/categories
router.get("/categories", getCategories);

// GET /api/products/featured
router.get("/featured", getFeaturedProducts);

// GET /api/products
router.get("/:id", getProductById);

router.get("/:id/related", getRelatedProducts);

export default router;
