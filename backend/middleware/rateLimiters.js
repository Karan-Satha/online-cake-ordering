import rateLimit from "express-rate-limit";

// Defense-in-depth baseline for every /api route.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Admin login is a brute-force target — keep this tight and keyed by IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts. Please try again later." },
});

// AI cake preview calls a paid OpenAI image model — cap it hard so a
// scripted client can't run up the bill or exhaust the quota.
export const cakePreviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many preview requests. Please try again in a while.",
  },
});

// Newsletter signup — generous, but stops scripted mass-subscribe abuse
// (and the email-sending cost that comes with each welcome email).
export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Customer login/register/password-reset — same brute-force concern as
// admin login, kept separate so a burst of customer signups can't also
// choke out admin login attempts or vice versa.
export const customerAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Please try again later." },
});

// Voucher lookup — public and unauthenticated, so cap it to make guessing
// codes impractical even though only one exists today.
export const voucherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});
