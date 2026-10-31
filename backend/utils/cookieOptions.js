import { config } from "../config/index.js";

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: config.nodeEnv === "production",
  path: "/",
  maxAge: 1000 * 60 * 60 * 8,
};

// Customers reasonably expect to stay logged in across visits, unlike the
// admin dashboard session — matches the 30d expiry on the customer JWT.
export const customerCookieOptions = {
  ...cookieOptions,
  maxAge: 1000 * 60 * 60 * 24 * 30,
};
