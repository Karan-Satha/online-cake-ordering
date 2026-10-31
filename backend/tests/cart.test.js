import { describe, expect, test } from "@jest/globals";
import { validateAddCartItem, validateUpdateCartItem } from "../validation/cart.js";

function run(validator, req) {
  let error;
  let continued = false;
  validator(req, {}, (nextError) => {
    error = nextError;
    continued = !nextError;
  });
  return { error, continued };
}

describe("cart request validation", () => {
  test("accepts a product, positive quantity, and optional variant", () => {
    expect(run(validateAddCartItem, { body: { productId: "4", quantity: "2", variantId: "8" } }))
      .toMatchObject({ error: undefined, continued: true });
  });

  test.each([
    [{ productId: "not-an-id", quantity: "1" }, "Invalid product"],
    [{ productId: "4", quantity: "0" }, "Invalid quantity"],
    [{ productId: "4", quantity: "1", variantId: "-2" }, "Invalid product size"],
  ])("rejects invalid add-item data %#", (body, message) => {
    expect(run(validateAddCartItem, { body }).error).toMatchObject({ message, statusCode: 400 });
  });

  test("rejects invalid update identifiers and quantities", () => {
    expect(run(validateUpdateCartItem, { params: { id: "x" }, body: { quantity: 1 } }).error.statusCode).toBe(400);
    expect(run(validateUpdateCartItem, { params: { id: "4" }, body: { quantity: 0 } }).error.message).toBe("Invalid quantity");
  });
});
