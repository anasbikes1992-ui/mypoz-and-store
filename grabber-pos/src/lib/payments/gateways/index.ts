import type { CurrencyCode, PaymentAdapter, ProviderKey } from "./types";
import { webxpayAdapter } from "./webxpay";
import { payhereAdapter } from "./payhere";
import { onepayAdapter } from "./onepay";
import { lankapayAdapter } from "./lankapay";
import { stripeAdapter } from "./stripe";

export * from "./types";

const ADAPTERS: Record<ProviderKey, PaymentAdapter> = {
  WEBXPAY: webxpayAdapter,
  PAYHERE: payhereAdapter,
  ONEPAY: onepayAdapter,
  LANKAPAY: lankapayAdapter,
  STRIPE: stripeAdapter,
};

export function getAdapter(provider: ProviderKey): PaymentAdapter | undefined {
  return ADAPTERS[provider];
}

export function pickProvider(currency: CurrencyCode, preferred?: ProviderKey): ProviderKey | null {
  if (preferred && ADAPTERS[preferred]?.currencies.includes(currency) && ADAPTERS[preferred].configured()) {
    return preferred;
  }
  const order: ProviderKey[] =
    currency === "USD"
      ? ["STRIPE", "PAYHERE"]
      : [
          (process.env.PAYMENTS_LKR_PROVIDER as ProviderKey) || "WEBXPAY",
          "WEBXPAY",
          "PAYHERE",
          "ONEPAY",
          "LANKAPAY",
        ];
  for (const key of order) {
    const a = ADAPTERS[key];
    if (a?.currencies.includes(currency) && a.configured()) return key;
  }
  return null;
}

export function anyGatewayConfigured(): boolean {
  return Object.values(ADAPTERS).some((a) => a.configured());
}
