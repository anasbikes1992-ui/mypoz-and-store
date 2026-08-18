import { describe, expect, it } from "vitest";
import { computeDiscount, normalizeCode } from "@/lib/commerce/discount-codes";

describe("discount codes", () => {
  it("normalizes codes", () => {
    expect(normalizeCode("  save 10 ")).toBe("SAVE10");
  });

  it("applies a fixed amount capped at subtotal", () => {
    const r = computeDiscount(
      { code: "FLAT", kind: "fixed", amount: 500, status: "active" },
      400,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discount).toBe(400);
  });

  it("applies a percent amount", () => {
    const r = computeDiscount(
      { code: "TEN", kind: "percent", amount: 10, status: "active" },
      1000,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.discount).toBe(100);
  });

  it("rejects expired and inactive codes", () => {
    expect(
      computeDiscount(
        { code: "OLD", kind: "fixed", amount: 10, status: "active", expiry: "2020-01-01" },
        100,
        new Date("2026-01-01"),
      ).ok,
    ).toBe(false);
    expect(
      computeDiscount(
        { code: "OFF", kind: "fixed", amount: 10, status: "paused" },
        100,
      ).ok,
    ).toBe(false);
  });
});
