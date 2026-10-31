import express from "express";

import { createOrder } from "../../controllers/shop/orderController.js";
import { getOrCreateCart } from "../../middleware/cartMiddleware.js";
import { validateCreateOrder } from "../../validation/order.js";

const router = express.Router();

router.post("/", getOrCreateCart, validateCreateOrder, createOrder);

export default router;
