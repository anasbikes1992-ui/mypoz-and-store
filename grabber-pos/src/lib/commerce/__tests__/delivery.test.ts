import { describe, expect, it } from "vitest";
import { quoteDelivery } from "@/lib/commerce/delivery";
import { defaultStoreConfig } from "@/lib/commerce/defaults";

describe("quoteDelivery", () => {
  const store = defaultStoreConfig();

  it("applies zone fee for courier delivery", () => {
    const quote = quoteDelivery(store, {
      subtotal: 5000,
      fulfilment: "courier",
      zoneId: "z_cmb",
      paymentMethod: "cash",
    });
    expect(quote.deliveryFee).toBe(350);
    expect(quote.total).toBeGreaterThan(5000);
  });

  it("waives delivery above free threshold", () => {
    const quote = quoteDelivery(store, {
      subtotal: 15000,
      fulfilment: "courier",
      zoneId: "z_cmb",
      paymentMethod: "bank_transfer",
    });
    expect(quote.deliveryFee).toBe(0);
    expect(quote.freeDeliveryApplied).toBe(true);
  });

  it("no delivery fee for pickup", () => {
    const quote = quoteDelivery(store, {
      subtotal: 5000,
      fulfilment: "pickup",
      paymentMethod: "cash",
    });
    expect(quote.deliveryFee).toBe(0);
  });

  it("adds COD fee for cash payment", () => {
    const storeWithCod = defaultStoreConfig({
      cod: { enabled: true, minOrder: 0, maxOrder: 100000, fee: 100, requireConfirmation: false },
    });
    const quote = quoteDelivery(storeWithCod, {
      subtotal: 5000,
      fulfilment: "pickup",
      paymentMethod: "cash",
    });
    expect(quote.codFee).toBe(100);
  });
});
