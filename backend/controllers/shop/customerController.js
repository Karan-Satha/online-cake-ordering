import asyncHandler from "../../middleware/asyncHandler.js";
import {
  registerCustomerService,
  loginCustomerService,
  getCurrentCustomerService,
  requestPasswordResetService,
  resetPasswordService,
} from "../../services/shop/customerAuthService.js";
import { getCustomerOrdersService } from "../../services/shop/customerOrderService.js";
import { customerCookieOptions } from "../../utils/cookieOptions.js";

export const register = asyncHandler(async (req, res) => {
  const { customer, token } = await registerCustomerService(req.body);

  res.cookie("customerToken", token, customerCookieOptions);

  res.status(201).json({ message: "Account created", customer });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { customer, token } = await loginCustomerService(email, password);

  res.cookie("customerToken", token, customerCookieOptions);

  res.json({ message: "Login successful", customer });
});

export function logout(req, res) {
  res.clearCookie("customerToken", customerCookieOptions);

  res.json({ message: "Logged out successfully" });
}

// Called on every page load to check login status, so this always
// responds 200 — a 401 here is not an error, it just means "logged out",
// and returning it as an HTTP error status floods the browser console with
// a scary-looking "Failed to load resource: 401" on every single page view
// for anonymous visitors. GET /orders below stays a real 401 since that's
// an actually-protected resource, not a routine status check.
export const getCurrentCustomer = asyncHandler(async (req, res) => {
  if (!req.customerId) {
    return res.json({ customer: null });
  }

  const customer = await getCurrentCustomerService(req.customerId);

  res.json({ customer });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordResetService(req.body.email);

  res.json({ message: "Reset link sent! Check your email." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = await resetPasswordService(req.body.token, req.body.password);

  res.cookie("customerToken", token, customerCookieOptions);

  res.json({ message: "Password updated" });
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const customer = await getCurrentCustomerService(req.customerId);
  const orders = await getCustomerOrdersService(customer.email);

  res.json(orders);
});
