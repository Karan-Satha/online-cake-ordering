import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";

import path from "path";
import { fileURLToPath } from "url";

import productRoutes from "./routes/shop/productRoutes.js";
import cartRoutes from "./routes/shop/cartRoutes.js";
import checkoutRoutes from "./routes/shop/checkoutRoutes.js";
import adminRoutes from "./routes/admin/adminRoutes.js";
import customCakeRoutes from "./routes/shop/customCakeRoutes.js";
import customCakeAdminRoutes from "./routes/admin/customCakeRoutes.js";
import webhookRoutes from "./routes/shop/webhookRoutes.js";
import newsletterRoutes from "./routes/shop/newsletterRoutes.js";
import customerRoutes from "./routes/shop/customerRoutes.js";
import voucherRoutes from "./routes/shop/voucherRoutes.js";
import analyticsRoutes from "./routes/shop/analyticsRoutes.js";

import errorHandler from "./middleware/errorHandler.js";

import { getOrCreateCart } from "./middleware/cartMiddleware.js";
import { apiLimiter } from "./middleware/rateLimiters.js";
import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { startAbandonedCartJob } from "./jobs/abandonedCartJob.js";
import { assertObjectStorageConfigured, getPrivateImageStream } from "./services/storage/objectStorage.js";
import { authenticateAdmin } from "./middleware/authMiddleware.js";
import pool from "./db.js";

const app = express();

assertObjectStorageConfigured();

const PORT = config.port || 3000;

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Middleware

// Behind a reverse proxy / load balancer (Render, Heroku, nginx, etc.) req.ip
// otherwise resolves to the proxy's address for every request, which breaks
// per-IP rate limiting and cookie "secure" negotiation.
if (config.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "img-src": [
          "'self'",
          "data:",
          // Neon Object Storage serves public product images from a
          // branch-prefixed hostname derived from the S3 endpoint.
          ...(process.env.AWS_ENDPOINT_URL_S3
            ? (() => {
                const storageHost = new URL(process.env.AWS_ENDPOINT_URL_S3).hostname;
                return [
                  storageHost.startsWith("storage.")
                    ? `https://*.${storageHost}`
                    : `https://${storageHost}`,
                ];
              })()
            : []),
        ],
      },
    },
    // Product/inspiration images under /uploads are meant to be embeddable
    // from the separate frontend origin used in local dev (Live Server on
    // :5500) and from any frontend deployed to a different origin in
    // production, so relax the default same-origin resource policy.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Gzip/brotli-compresses JSON and HTML/CSS/JS responses. Free bandwidth and
// latency win — costs a small amount of CPU per request, negligible at this
// scale.
app.use(compression());

// Always allow the configured frontend URL; also allow the local dev
// server ports used by Live Server / similar tools when not in production.
const allowedOrigins = new Set([config.frontendUrl]);

if (config.nodeEnv !== "production") {
  allowedOrigins.add("http://localhost:5500");
  allowedOrigins.add("http://127.0.0.1:5500");
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header, e.g. curl/Postman)
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(cookieParser());

app.use("/api", apiLimiter);

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    logger.error(`Health check database query failed: ${error.message}`);
    res.status(503).json({ status: "unavailable" });
  }
});

app.get("/uploads/custom-cakes/:filename", authenticateAdmin, async (req, res, next) => {
  try {
    const filename = path.basename(req.params.filename);
    res.setHeader("Cache-Control", "private, no-store");
    const stored = await getPrivateImageStream(filename);
    if (stored) {
      res.setHeader("Content-Type", stored.contentType);
      stored.body.pipe(res);
      return;
    }
    res.sendFile(path.join(__dirname, "uploads", "custom-cakes", filename));
  } catch (error) {
    next(error);
  }
});

app.use(
  "/uploads/products",
  express.static(path.join(__dirname, "uploads", "products"), {
    // Uploaded images get a fresh, random filename every time (see
    // uploadMiddleware.js), so a given URL's content never changes — safe
    // to cache for a full year with "immutable" (skips revalidation
    // entirely, not just a 304 round-trip).
    maxAge: "1y",
    immutable: true,
  }),
);

const frontendPath = path.join(__dirname, "..", "frontend");

// Routes
app.use("/api/products", productRoutes);
app.use("/api/cart", getOrCreateCart, cartRoutes);
app.use("/api/checkout", getOrCreateCart, checkoutRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/custom-cakes", customCakeRoutes);
app.use("/api/admin/custom-cakes", customCakeAdminRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/analytics", analyticsRoutes);

// Frontend page routes — these must be registered before
// express.static(frontendPath) below. Some of these paths (e.g. "/checkout")
// share a name with a real directory on disk ("frontend/checkout/"), and
// express.static's directory-redirect behaviour would otherwise intercept
// the request before it ever reaches these handlers.

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// All products page
app.get("/shop/all", (req, res) => {
  res.sendFile(path.join(frontendPath, "products.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(frontendPath, "checkout.html"));
});

app.get("/checkout/confirmation", (req, res) => {
  res.sendFile(path.join(frontendPath, "checkout", "confirmation.html"));
});

app.get("/account", (req, res) => {
  res.sendFile(path.join(frontendPath, "account.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(frontendPath, "reset-password.html"));
});

// Category page
app.get("/shop/:categorySlug", (req, res) => {
  res.sendFile(path.join(frontendPath, "products.html"));
});

// Static assets (css, js, images, etc.)
app.use(
  express.static(frontendPath, {
    // CSS/JS/fonts/images are safe to cache aggressively — the browser
    // still revalidates for free via ETag if a file changes. HTML pages
    // are the exception: cache those and a deploy could leave visitors
    // stuck on a stale page for up to a day.
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

// Product page
app.get("/:slug/:id", (req, res) => {
  res.sendFile(path.join(frontendPath, "product.html"));
});

// Error Handler (always last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Home Cake API running on http://localhost:${PORT}`);
});

startAbandonedCartJob();
