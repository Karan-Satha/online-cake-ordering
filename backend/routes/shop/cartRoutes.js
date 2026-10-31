import express from "express";

import {
  getCart,
  addCartItem,
  updateCartItem,
  deleteCartItem,
} from "../../controllers/shop/cartController.js";

import { getOrCreateCart } from "../../middleware/cartMiddleware.js";

import {
  validateAddCartItem,
  validateUpdateCartItem,
} from "../../validation/cart.js";

const router = express.Router();

router.get("/", getOrCreateCart, getCart);

router.post("/items", getOrCreateCart, validateAddCartItem, addCartItem);

router.patch(
  "/items/:id",
  getOrCreateCart,
  validateUpdateCartItem,
  updateCartItem,
);

router.delete("/items/:id", getOrCreateCart, deleteCartItem);

export default router;
