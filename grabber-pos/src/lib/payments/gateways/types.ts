export type ProviderKey = "WEBXPAY" | "PAYHERE" | "ONEPAY" | "LANKAPAY" | "STRIPE";
export type CurrencyCode = "LKR" | "USD";
export type PayStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";

export const PROVIDER_KEYS: ProviderKey[] = ["WEBXPAY", "PAYHERE", "ONEPAY", "LANKAPAY", "STRIPE"];

export interface CheckoutInput {
  reference: string;
  amountMinor: number;
  currency: CurrencyCode;
  description: string;
  customer: { name: string; email: string; phone?: string };
  returnUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  mode: "redirect" | "form";
  url?: string;
  formAction?: string;
  formFields?: Record<string, string>;
}

export interface WebhookResult {
  reference: string;
  providerRef?: string;
  status: PayStatus;
  verified: boolean;
  amountMinor?: number;
  currency?: CurrencyCode;
}

export interface PaymentAdapter {
  key: ProviderKey;
  currencies: CurrencyCode[];
  configured(): boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookResult | null>;
}

export function toMajor(amountMinor: number): number {
  return amountMinor / 100;
}
