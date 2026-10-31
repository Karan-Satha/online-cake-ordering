import express from "express";

import {
  getCustomCakes,
  getCustomCake,
  updateStatus,
  updateQuote,
  updateNotes,
} from "../../controllers/admin/customCakeController.js";

import { authenticateAdmin } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Protected routes
router.use(authenticateAdmin);

router.get("/", getCustomCakes);

router.get("/:id", getCustomCake);

router.patch("/:id/status", updateStatus);

router.patch("/:id/quote", updateQuote);

router.patch("/:id/notes", updateNotes);

export default router;
