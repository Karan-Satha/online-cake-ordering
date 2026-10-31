import express from "express";

import {
  register,
  login,
  logout,
  getCurrentCustomer,
  forgotPassword,
  resetPassword,
  getMyOrders,
} from "../../controllers/shop/customerController.js";
import { authenticateCustomer, attachCustomerIfPresent } from "../../middleware/customerAuthMiddleware.js";
import { customerAuthLimiter } from "../../middleware/rateLimiters.js";

const router = express.Router();

router.post("/register", customerAuthLimiter, register);
router.post("/login", customerAuthLimiter, login);
router.post("/logout", logout);
router.post("/forgot-password", customerAuthLimiter, forgotPassword);
router.post("/reset-password", customerAuthLimiter, resetPassword);

router.get("/me", attachCustomerIfPresent, getCurrentCustomer);
router.get("/orders", authenticateCustomer, getMyOrders);

export default router;
