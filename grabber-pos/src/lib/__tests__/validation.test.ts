import { describe, it, expect } from "vitest";
import { createSaleSchema, productQuerySchema } from "../validation";

describe("createSaleSchema", () => {
  it("accepts a valid cash sale", () => {
    const result = createSaleSchema.safeParse({
      lines: [{ productId: "P1", quantity: 2, discount: 0 }],
      paymentMethod: "cash",
      cashReceived: 500,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty sale", () => {
    const result = createSaleSchema.safeParse({
      lines: [],
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-integer quantity", () => {
    const result = createSaleSchema.safeParse({
      lines: [{ productId: "P1", quantity: 1.5, discount: 0 }],
      paymentMethod: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown payment method", () => {
    const result = createSaleSchema.safeParse({
      lines: [{ productId: "P1", quantity: 1, discount: 0 }],
      paymentMethod: "crypto",
    });
    expect(result.success).toBe(false);
  });

  it("defaults discount to 0 when omitted", () => {
    const result = createSaleSchema.safeParse({
      lines: [{ productId: "P1", quantity: 1 }],
      paymentMethod: "card",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.lines[0].discount).toBe(0);
  });
});

describe("productQuerySchema", () => {
  it("coerces and clamps pagination", () => {
    const result = productQuerySchema.safeParse({ page: "2", pageSize: "999" });
    expect(result.success).toBe(false); // pageSize > 200 max
  });

  it("applies defaults", () => {
    const result = productQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(60);
  });
});
