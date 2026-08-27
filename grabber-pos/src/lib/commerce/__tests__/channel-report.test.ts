import { describe, expect, it } from "vitest";
import {
  salesByChannel,
  todayChannelSnapshot,
} from "@/lib/commerce/channel-report";
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

describe("todayChannelSnapshot", () => {
  it("counts today's POS / WEB / WA only", () => {
    const now = new Date("2026-08-28T10:00:00+05:30");
    const snap = todayChannelSnapshot(
      [
        sale({
          id: "1",
          source: "POS",
          total: 100,
          createdAt: "2026-08-28T02:00:00.000Z",
        }),
        sale({
          id: "2",
          source: "ONLINE_STORE",
          total: 50,
          createdAt: "2026-08-28T03:00:00.000Z",
        }),
        sale({
          id: "3",
          source: "WHATSAPP",
          total: 25,
          createdAt: "2026-08-28T04:00:00.000Z",
        }),
        sale({
          id: "4",
          source: "POS",
          total: 999,
          createdAt: "2026-08-27T10:00:00.000Z",
        }),
      ],
      { timeZone: "Asia/Colombo", now },
    );
    expect(snap).toEqual({
      pos: 1,
      web: 1,
      whatsapp: 1,
      total: 3,
      revenue: 175,
    });
  });
});
