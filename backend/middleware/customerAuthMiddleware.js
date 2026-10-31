import { verifyCustomerToken } from "../utils/jwt.js";

export function authenticateCustomer(req, res, next) {
  const token = req.cookies.customerToken;

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  try {
    const decoded = verifyCustomerToken(token);

    req.customerId = decoded.customerId;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired session",
    });
  }
}

// For routes that behave differently when logged in but don't require it
// (none currently, but kept for parity/future use — e.g. showing "Sign in
// to save this" prompts without blocking the page).
export function attachCustomerIfPresent(req, res, next) {
  const token = req.cookies.customerToken;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyCustomerToken(token);

    req.customerId = decoded.customerId;
  } catch (error) {
    // Invalid/expired token on an optional route — just proceed logged out.
  }

  next();
}
