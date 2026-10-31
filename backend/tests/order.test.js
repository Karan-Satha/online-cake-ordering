import { describe, expect, test } from "@jest/globals";
import { validateCreateOrder } from "../validation/order.js";

function run(body) {
  let error;
  let continued = false;
  validateCreateOrder({ body }, {}, (nextError) => {
    error = nextError;
    continued = !nextError;
  });
  return { error, continued };
}

describe("checkout order validation", () => {
  const validOrder = {
    customerName: "Casey Customer", customerEmail: "casey@example.com", customerPhone: "020 1234 5678",
    deliveryAddress: "1 Cake Lane", deliveryCity: "London", deliveryPostcode: "SW1A 1AA",
  };

  test("accepts complete delivery details", () => {
    expect(run(validOrder)).toMatchObject({ error: undefined, continued: true });
  });

  test.each(["customerName", "customerEmail", "customerPhone", "deliveryAddress", "deliveryCity", "deliveryPostcode"])(
    "requires %s",
    (field) => {
      const body = { ...validOrder, [field]: "" };
      expect(run(body).error).toMatchObject({ message: "Please complete all required fields", statusCode: 400 });
    },
  );
});
