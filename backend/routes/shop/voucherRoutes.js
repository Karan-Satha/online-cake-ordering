import express from "express";

import { lookupVoucher } from "../../controllers/shop/voucherController.js";
import { voucherLimiter } from "../../middleware/rateLimiters.js";

const router = express.Router();

router.get("/:code", voucherLimiter, lookupVoucher);

export default router;
