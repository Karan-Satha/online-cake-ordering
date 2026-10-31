import express from "express";
import { submitCustomCake, generateCakePreview } from "../../controllers/shop/customCakeController.js";

import { uploadCakeImages } from "../../middleware/uploadMiddleware.js";
import { cakePreviewLimiter } from "../../middleware/rateLimiters.js";

const router = express.Router();

router.post("/", uploadCakeImages, submitCustomCake);

router.post("/preview", cakePreviewLimiter, generateCakePreview);

export default router;
