import express from "express";

import {
  completeSession,
  createSession,
} from "../../controllers/shop/checkoutController.js";
import { validateCreateOrder } from "../../validation/order.js";

const router = express.Router();

router.post("/session", validateCreateOrder, createSession);
router.post("/complete", completeSession);

export default router;
