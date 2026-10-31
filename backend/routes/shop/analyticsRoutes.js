import express from "express";
import { trackVisitorPageView } from "../../controllers/shop/analyticsController.js";

const router = express.Router();

router.post("/session", trackVisitorPageView);

export default router;
