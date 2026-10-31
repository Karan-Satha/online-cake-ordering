import { verifyAdminToken } from "../utils/jwt.js";

export function authenticateAdmin(req, res, next) {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  try {
    const decoded = verifyAdminToken(token);

    req.adminId = decoded.adminId;

    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired session",
    });
  }
}
