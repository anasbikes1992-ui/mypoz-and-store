import { describe, expect, it } from "vitest";
import { quoteDelivery } from "@/lib/commerce/delivery";
import { createSaleSchema } from "@/lib/validation";
import { reconcileSaleTotals } from "@/lib/sale-totals";
import type { StoreConfig } from "@/lib/commerce/schema";

const store: Pick<StoreConfig, "delivery" | "cod"> = {
  delivery: {
    pickup: true,
    localDelivery: true,
    islandwide: true,
    freeThreshold: 0,
    zones: [{ id: "colombo", name: "Colombo", fee: 350 }],
  },
  cod: { enabled: true, fee: 50, minOrder: 0, maxOrder: 0, requireConfirmation: false },
};

describe("money path — POS create_sale payload", () => {
  it("accepts a cash POS sale with stock lines", () => {
    const parsed = createSaleSchema.safeParse({
      paymentMethod: "cash",
      cashReceived: 1000,
      clientUuid: "11111111-1111-1111-1111-111111111111",
      source: "POS",
      lines: [{ productId: "prod-1", quantity: 1, discount: 0 }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("money path — storefront COD", () => {
  it("quotes delivery + COD fees without trusting client totals", () => {
    const quote = quoteDelivery(store, {
      subtotal: 1000,
      fulfilment: "courier",
      zoneId: "colombo",
      paymentMethod: "cash",
    });
    expect(quote.deliveryFee).toBe(350);
    expect(quote.codFee).toBe(50);
    expect(quote.total).toBe(1400);
  });

  it("stamps ONLINE_STORE on the storefront create_sale contract", () => {
    const parsed = createSaleSchema.safeParse({
      paymentMethod: "cash",
      cashReceived: 1400,
      clientUuid: "22222222-2222-2222-2222-222222222222",
      source: "ONLINE_STORE",
      channel: "storefront",
      lines: [{ productId: "prod-1", quantity: 1, discount: 0 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.source).toBe("ONLINE_STORE");
    }
  });
});

describe("sale total reconciliation", () => {
  it("matches Anaz COD smoke shape (lines + delivery = total)", () => {
    const r = reconcileSaleTotals({
      subtotal: 500,
      discountTotal: 0,
      finalDiscount: 0,
      serviceCharge: 0,
      deliveryFee: 600,
      codFee: 0,
      total: 1100,
      linesSum: 500,
    });
    expect(r.ok).toBe(true);
    expect(r.expected).toBe(1100);
  });

  it("rejects double-counted service+delivery", () => {
    const r = reconcileSaleTotals({
      subtotal: 500,
      discountTotal: 0,
      serviceCharge: 600,
      deliveryFee: 600,
      total: 1100,
      linesSum: 500,
    });
    expect(r.ok).toBe(false);
  });
});
