import express from "express";

import { loginAdmin, logoutAdmin, getCurrentAdmin } from "../../controllers/admin/authController.js";

import { getOrders, getOrderById, updateOrderStatus } from "../../controllers/admin/orderController.js";

import {
  getProducts,
  createProduct,
  updateProduct,
  getProductById,
  deleteProduct,
} from "../../controllers/admin/productController.js";

import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/admin/categoryController.js";

import {
  getVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
} from "../../controllers/admin/voucherController.js";

import { getDashboardStats } from "../../controllers/admin/dashboardController.js";

import { authenticateAdmin } from "../../middleware/authMiddleware.js";

import { validateLogin } from "../../validation/login.js";

import { uploadProductImages } from "../../middleware/uploadMiddleware.js";
import { loginLimiter } from "../../middleware/rateLimiters.js";

const router = express.Router();

router.post("/login", loginLimiter, validateLogin, loginAdmin);
// Protected routes
router.use(authenticateAdmin);

router.post("/logout", logoutAdmin);

router.get("/me", getCurrentAdmin);

router.get("/orders", getOrders);

router.get("/orders/:id", getOrderById);

router.patch("/orders/:id/status", updateOrderStatus);

router.get("/products", getProducts);

router.get("/products/:id", getProductById);

router.post("/products", uploadProductImages, createProduct);

router.patch("/products/:id", uploadProductImages, updateProduct);

router.delete("/products/:id", deleteProduct);

router.get("/dashboard", getDashboardStats);

router.get("/categories", getCategories);

router.get("/categories/:id", getCategoryById);

router.post("/categories", createCategory);

router.patch("/categories/:id", updateCategory);

router.delete("/categories/:id", deleteCategory);

router.get("/vouchers", getVouchers);

router.get("/vouchers/:id", getVoucherById);

router.post("/vouchers", createVoucher);

router.patch("/vouchers/:id", updateVoucher);

router.delete("/vouchers/:id", deleteVoucher);

export default router;
