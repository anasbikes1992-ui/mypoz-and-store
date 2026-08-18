import type { CheckoutInput, CheckoutResult, PaymentAdapter, WebhookResult } from "./types";
import { toMajor } from "./types";
import { hmacSha256Hex, safeEqual } from "./sig";

function e(k: string) {
  return process.env[k];
}

export const lankapayAdapter: PaymentAdapter = {
  key: "LANKAPAY",
  currencies: ["LKR"],
  configured: () => Boolean(e("LANKAPAY_IPG_URL") && e("LANKAPAY_MERCHANT_ID") && e("LANKAPAY_SECRET")),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const ipgUrl = e("LANKAPAY_IPG_URL");
    const merchantId = e("LANKAPAY_MERCHANT_ID");
    const secret = e("LANKAPAY_SECRET");
    if (!ipgUrl || !merchantId || !secret) throw new Error("LankaPay not configured");
    const amount = toMajor(input.amountMinor).toFixed(2);
    const signature = hmacSha256Hex(`${merchantId}|${input.reference}|${amount}|${input.currency}`, secret);
    const url = new URL(ipgUrl);
    url.searchParams.set("merchant_id", merchantId);
    url.searchParams.set("order_id", input.reference);
    url.searchParams.set("amount", amount);
    url.searchParams.set("currency", input.currency);
    url.searchParams.set("return_url", `${input.returnUrl}?ref=${encodeURIComponent(input.reference)}`);
    url.searchParams.set("cancel_url", input.cancelUrl);
    url.searchParams.set("signature", signature);
    return { mode: "redirect", url: url.toString() };
  },

  async verifyWebhook(_headers: Headers, rawBody: string): Promise<WebhookResult | null> {
    const secret = e("LANKAPAY_SECRET");
    const p = new URLSearchParams(rawBody);
    const reference = p.get("order_id");
    if (!reference) return null;
    const status = (p.get("status") ?? "").toUpperCase();
    const sig = p.get("signature") ?? "";
    let verified = false;
    if (secret && sig) {
      const base = `${reference}|${status}|${p.get("transaction_id") ?? ""}`;
      verified = safeEqual(hmacSha256Hex(base, secret), sig);
    }
    const mapped = status === "SUCCESS" || status === "00" ? "PAID" : status ? "FAILED" : "PENDING";
    return {
      reference,
      providerRef: p.get("transaction_id") ?? undefined,
      status: mapped,
      verified,
    };
  },
};
