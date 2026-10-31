import asyncHandler from "../../middleware/asyncHandler.js";

import {
  loginAdminService,
  getCurrentAdminService,
} from "../../services/admin/authService.js";

import { cookieOptions } from "../../utils/cookieOptions.js";

export const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { admin, token } = await loginAdminService(email, password);

  res.cookie("adminToken", token, cookieOptions);

  res.json({
    message: "Login successful",
    admin,
  });
});

export function logoutAdmin(req, res) {
  res.clearCookie("adminToken", cookieOptions);

  res.json({
    message: "Logged out successfully",
  });
}

export const getCurrentAdmin = asyncHandler(async (req, res) => {
  const admin = await getCurrentAdminService(req.adminId);

  res.json(admin);
});
