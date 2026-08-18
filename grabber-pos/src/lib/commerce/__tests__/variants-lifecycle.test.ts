import { describe, expect, it } from "vitest";
import {
  cartesianVariants,
  commerceLineKey,
  parseCommerceLineId,
} from "@/lib/commerce/line-ids";
import { allowedFulfillmentNext } from "@/lib/commerce/order-lifecycle";

describe("parseCommerceLineId", () => {
  it("keeps a bare product id", () => {
    expect(parseCommerceLineId("prod-1")).toEqual({
      productId: "prod-1",
      variantId: null,
      variantSku: null,
    });
  });

  it("splits uuid variant ids", () => {
    const product = "11111111-1111-4111-8111-111111111111";
    const variant = "22222222-2222-4222-8222-222222222222";
    expect(parseCommerceLineId(`${product}:${variant}`)).toEqual({
      productId: product,
      variantId: variant,
      variantSku: null,
    });
  });

  it("treats non-uuid suffixes as SKU", () => {
    expect(parseCommerceLineId("P-9:BLK-M")).toEqual({
      productId: "P-9",
      variantId: null,
      variantSku: "BLK-M",
    });
  });

  it("builds a stable cart key", () => {
    expect(commerceLineKey("p1", "v1")).toBe("p1:v1");
    expect(commerceLineKey("p1")).toBe("p1");
  });
});

describe("cartesianVariants", () => {
  it("builds size × color SKUs", () => {
    const rows = cartesianVariants([
      { name: "Size", values: ["S", "M"] },
      { name: "Color", values: ["Black", "White"] },
    ]);
    expect(rows.map((r) => r.title)).toEqual([
      "S / Black",
      "S / White",
      "M / Black",
      "M / White",
    ]);
    expect(rows[0]?.option1).toBe("S");
    expect(rows[0]?.option2).toBe("Black");
  });
});

describe("fulfillment lifecycle", () => {
  it("blocks delivered as a pickup next step", () => {
    expect(allowedFulfillmentNext("ready", "pickup")).toContain("collected");
    expect(allowedFulfillmentNext("ready", "pickup")).not.toContain("shipped");
  });

  it("allows cancel from pending", () => {
    expect(allowedFulfillmentNext("pending")).toContain("cancelled");
  });
});
