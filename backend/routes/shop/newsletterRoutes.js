import express from "express";

import { subscribe, unsubscribe } from "../../controllers/shop/newsletterController.js";
import { newsletterLimiter } from "../../middleware/rateLimiters.js";

const router = express.Router();

router.post("/subscribe", newsletterLimiter, subscribe);
router.get("/unsubscribe", unsubscribe);

export default router;
