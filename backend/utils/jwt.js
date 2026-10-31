import { config } from "../config/index.js";
import jwt from "jsonwebtoken";

export function createAdminToken(adminId) {
  return jwt.sign(
    {
      adminId,
    },
    config.jwtSecret,
    {
      expiresIn: "2h",
    },
  );
}

export function verifyAdminToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

// Customer tokens include role: "customer" so a customer's cookie can never
// be mistaken for (or reused as) an admin token, even though both are
// signed with the same secret and could otherwise share a shape.
export function createCustomerToken(customerId) {
  return jwt.sign(
    {
      customerId,
      role: "customer",
    },
    config.jwtSecret,
    {
      expiresIn: "30d",
    },
  );
}

export function verifyCustomerToken(token) {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (decoded.role !== "customer") {
    throw new Error("Invalid token");
  }

  return decoded;
}
