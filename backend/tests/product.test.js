import { afterEach, describe, expect, test } from "@jest/globals";
import { getCached, invalidateAll } from "../services/shop/productCache.js";

afterEach(() => invalidateAll());

describe("storefront product cache", () => {
  test("serves the cached value until invalidated", async () => {
    let loads = 0;
    const load = async () => ({ version: ++loads });

    expect(await getCached("test:products", load)).toEqual({ version: 1 });
    expect(await getCached("test:products", load)).toEqual({ version: 1 });
    expect(loads).toBe(1);

    invalidateAll();
    expect(await getCached("test:products", load)).toEqual({ version: 2 });
  });
});
