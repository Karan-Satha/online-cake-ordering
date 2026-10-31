import { beforeAll, describe, expect, test } from "@jest/globals";

let createAdminToken;
let createCustomerToken;
let verifyAdminToken;
let verifyCustomerToken;

beforeAll(async () => {
  process.env.JWT_SECRET = "test-only-secret-with-at-least-32-characters";
  ({ createAdminToken, createCustomerToken, verifyAdminToken, verifyCustomerToken } = await import("../utils/jwt.js"));
});

describe("JWT authentication tokens", () => {
  test("round trips admin and customer identities", () => {
    expect(verifyAdminToken(createAdminToken(17)).adminId).toBe(17);
    expect(verifyCustomerToken(createCustomerToken(23))).toMatchObject({ customerId: 23, role: "customer" });
  });

  test("does not accept an admin token as a customer token", () => {
    expect(() => verifyCustomerToken(createAdminToken(17))).toThrow("Invalid token");
  });

  test("rejects a modified token", () => {
    const token = createAdminToken(17);
    expect(() => verifyAdminToken(`${token}invalid`)).toThrow();
  });
});
