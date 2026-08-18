import type { StoreConfig } from "./schema";
import type { FulfilmentMode } from "@/lib/website";

export interface DeliveryQuoteInput {
  subtotal: number;
  fulfilment: FulfilmentMode;
  zoneId?: string | null;
  paymentMethod?: string;
}

export interface DeliveryQuote {
  deliveryFee: number;
  codFee: number;
  freeDeliveryApplied: boolean;
  zoneName: string | null;
  subtotal: number;
  total: number;
}

/** Server-side delivery + COD fee calculation. Never trust client totals. */
export function quoteDelivery(
  store: Pick<StoreConfig, "delivery" | "cod">,
  input: DeliveryQuoteInput,
): DeliveryQuote {
  const { subtotal, fulfilment, zoneId, paymentMethod } = input;
  let deliveryFee = 0;
  let zoneName: string | null = null;

  if (fulfilment !== "pickup" && store.delivery) {
    const freeThreshold = store.delivery.freeThreshold ?? 0;
    const freeApplied = freeThreshold > 0 && subtotal >= freeThreshold;

    if (!freeApplied) {
      if (zoneId) {
        const zone = store.delivery.zones.find((z) => z.id === zoneId);
        if (zone) {
          deliveryFee = zone.fee;
          zoneName = zone.name;
        }
      } else if (fulfilment === "courier" && store.delivery.islandwide) {
        const fallback = store.delivery.zones.find((z) =>
          /island/i.test(z.name),
        );
        deliveryFee = fallback?.fee ?? store.delivery.zones.at(-1)?.fee ?? 0;
        zoneName = fallback?.name ?? "Islandwide";
      } else if (store.delivery.localDelivery) {
        const fallback = store.delivery.zones[0];
        deliveryFee = fallback?.fee ?? 0;
        zoneName = fallback?.name ?? "Local";
      }
    }

    return {
      deliveryFee: freeApplied ? 0 : deliveryFee,
      codFee: calcCodFee(store, subtotal, paymentMethod),
      freeDeliveryApplied: freeApplied,
      zoneName,
      subtotal,
      total: subtotal + (freeApplied ? 0 : deliveryFee) + calcCodFee(store, subtotal, paymentMethod),
    };
  }

  const codFee = calcCodFee(store, subtotal, paymentMethod);
  return {
    deliveryFee: 0,
    codFee,
    freeDeliveryApplied: false,
    zoneName: null,
    subtotal,
    total: subtotal + codFee,
  };
}

function calcCodFee(
  store: Pick<StoreConfig, "cod">,
  subtotal: number,
  paymentMethod?: string,
): number {
  if (!store.cod?.enabled || paymentMethod !== "cash") return 0;
  if (store.cod.minOrder > 0 && subtotal < store.cod.minOrder) {
    throw new Error(`ORDER: minimum order for COD is LKR ${store.cod.minOrder}`);
  }
  if (store.cod.maxOrder > 0 && subtotal > store.cod.maxOrder) {
    throw new Error(`ORDER: maximum order for COD is LKR ${store.cod.maxOrder}`);
  }
  return store.cod.fee ?? 0;
}
