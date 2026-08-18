import { describe, expect, it } from "vitest";
import { salesByChannel } from "@/lib/commerce/channel-report";
import type { Sale } from "@/lib/types";

function sale(partial: Partial<Sale>): Sale {
  return {
    id: "1",
    createdAt: "2026-08-01T00:00:00.000Z",
    lines: [],
    subtotal: 100,
    discountTotal: 0,
    finalDiscount: 0,
    serviceCharge: 0,
    total: 100,
    paymentMethod: "cash",
    isWholesale: false,
    customerName: null,
    customerMobile: null,
    employee: null,
    cashReceived: 100,
    change: 0,
    status: "completed",
    ...partial,
  };
}

describe("salesByChannel", () => {
  it("splits POS and storefront revenue", () => {
    const rows = salesByChannel([
      sale({ id: "a", source: "POS", total: 200 }),
      sale({ id: "b", source: "ONLINE_STORE", total: 50 }),
      sale({ id: "c", source: "POS", total: 10, status: "voided" }),
    ]);
    expect(rows.find((r) => r.source === "POS")).toEqual({
      source: "POS",
      count: 1,
      revenue: 200,
    });
    expect(rows.find((r) => r.source === "ONLINE_STORE")?.revenue).toBe(50);
  });
});
