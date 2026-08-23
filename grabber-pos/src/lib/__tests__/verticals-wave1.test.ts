import { describe, expect, it } from "vitest";
import {
  moqShortfall,
  resolveActiveTier,
  resolveTierUnitPrice,
} from "@/lib/pricing-tiers";
import {
  catalogPrice,
  cartTotals,
  effectivePrice,
  lineMoqWarnings,
} from "@/lib/store/cart-store";
import type { CartLine } from "@/lib/types";
import {
  bookingTotals,
  datesOverlap,
  daysOverdue,
  suggestedOverdueFee,
} from "@/lib/booking-math";
import type { Booking } from "@/lib/booking-types";

function line(
  partial: Partial<CartLine> & Pick<CartLine, "productId" | "name">,
): CartLine {
  return {
    unitPrice: 100,
    wholesalePrice: 80,
    vipPrice: 70,
    catalogUnitPrice: 100,
    catalogWholesalePrice: 80,
    catalogVipPrice: 70,
    minWholesaleQty: 0,
    quantity: 1,
    discount: 0,
    maxDiscount: 10,
    available: 100,
    ...partial,
  };
}

describe("pricing tiers", () => {
  it("resolves retail / wholesale / vip with fallbacks", () => {
    expect(
      resolveTierUnitPrice({
        tier: "retail",
        salePrice: 100,
        wholesalePrice: 80,
        vipPrice: 70,
      }),
    ).toBe(100);
    expect(
      resolveTierUnitPrice({
        tier: "wholesale",
        salePrice: 100,
        wholesalePrice: 80,
        vipPrice: 70,
      }),
    ).toBe(80);
    expect(
      resolveTierUnitPrice({
        tier: "vip",
        salePrice: 100,
        wholesalePrice: 80,
        vipPrice: 70,
      }),
    ).toBe(70);
    expect(
      resolveTierUnitPrice({
        tier: "vip",
        salePrice: 100,
        wholesalePrice: 80,
        vipPrice: null,
      }),
    ).toBe(80);
  });

  it("picks active tier from mode + customer", () => {
    expect(
      resolveActiveTier({ isWholesaleMode: false, customerTier: null }),
    ).toBe("retail");
    expect(
      resolveActiveTier({ isWholesaleMode: true, customerTier: null }),
    ).toBe("wholesale");
    expect(
      resolveActiveTier({ isWholesaleMode: false, customerTier: "vip" }),
    ).toBe("vip");
  });

  it("computes MOQ shortfall", () => {
    expect(moqShortfall(3, 12)).toBe(9);
    expect(moqShortfall(12, 12)).toBe(0);
    expect(moqShortfall(5, 0)).toBe(0);
  });
});

describe("cart effective pricing", () => {
  it("uses VIP when customer tier is vip", () => {
    const l = line({ productId: "1", name: "Widget" });
    expect(effectivePrice(l, false, "vip")).toBe(70);
    expect(catalogPrice(l, true, "wholesale")).toBe(80);
  });

  it("warns on MOQ under wholesale", () => {
    const lines = [
      line({
        productId: "1",
        name: "Case",
        quantity: 2,
        minWholesaleQty: 12,
      }),
    ];
    const warns = lineMoqWarnings(lines, true, null);
    expect(warns).toHaveLength(1);
    expect(warns[0]!.moq).toBe(12);
    expect(lineMoqWarnings(lines, false, null)).toHaveLength(0);
  });

  it("totals use tier price", () => {
    const totals = cartTotals({
      lines: [line({ productId: "1", name: "A", quantity: 2 })],
      isWholesale: true,
      serviceCharge: 0,
      finalDiscount: 0,
      customerPriceTier: null,
    });
    expect(totals.subtotal).toBe(160);
  });
});

describe("booking date helpers", () => {
  it("detects overlapping ranges", () => {
    expect(
      datesOverlap("2026-01-01", "2026-01-05", "2026-01-04", "2026-01-10"),
    ).toBe(true);
    expect(
      datesOverlap("2026-01-01", "2026-01-03", "2026-01-04", "2026-01-10"),
    ).toBe(false);
  });

  it("computes duration and folio total", () => {
    const b: Booking = {
      id: "BK-1",
      type: "room",
      customer: "A",
      phone: "",
      subject: "101",
      rate: 5000,
      startDate: "2026-01-01",
      endDate: "2026-01-03",
      deposit: 1000,
      overdueFee: 0,
      depositDisposition: "held",
      status: "active",
      extras: [{ id: "X1", description: "Mini bar", amount: 500, kind: "fnb" }],
      createdAt: "",
      updatedAt: "",
    };
    const t = bookingTotals(b);
    expect(t.duration).toBe(2);
    expect(t.stayCharge).toBe(10000);
    expect(t.extras).toBe(500);
    expect(t.total).toBe(10500);
  });

  it("suggests overdue fee when past end", () => {
    const fee = suggestedOverdueFee(
      { endDate: "2020-01-01", rate: 1000 },
      new Date("2020-01-11T12:00:00Z"),
    );
    expect(fee).toBeGreaterThan(0);
    expect(daysOverdue({ endDate: "2099-01-01" })).toBe(0);
  });
});
