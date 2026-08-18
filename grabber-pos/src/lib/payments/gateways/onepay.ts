import type { CheckoutInput, CheckoutResult, PaymentAdapter, WebhookResult } from "./types";
import { toMajor } from "./types";
import { hmacSha256Hex, safeEqual } from "./sig";

function e(k: string) {
  return process.env[k];
}

export const onepayAdapter: PaymentAdapter = {
  key: "ONEPAY",
  currencies: ["LKR"],
  configured: () => Boolean(e("ONEPAY_APP_ID") && e("ONEPAY_APP_TOKEN") && e("ONEPAY_HASH_SALT")),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const appId = e("ONEPAY_APP_ID");
    const appToken = e("ONEPAY_APP_TOKEN");
    const hashSalt = e("ONEPAY_HASH_SALT");
    const apiUrl = e("ONEPAY_API_URL") ?? "https://api.onepay.lk/v3/checkout/link/";
    if (!appId || !appToken || !hashSalt) throw new Error("OnePay not configured");
    const amount = Number(toMajor(input.amountMinor).toFixed(2));
    const hash = hmacSha256Hex(`${appId}${amount}${input.currency}${input.reference}`, hashSalt);
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: appToken },
      body: JSON.stringify({
        currency: input.currency,
        app_id: appId,
        hash,
        amount,
        reference: input.reference,
        customer_first_name: input.customer.name.split(" ")[0] ?? input.customer.name,
        customer_last_name: input.customer.name.split(" ").slice(1).join(" ") || "-",
        customer_phone_number: input.customer.phone ?? "",
        customer_email: input.customer.email,
        transaction_redirect_url: `${input.returnUrl}?ref=${encodeURIComponent(input.reference)}`,
      }),
    });
    const json: unknown = await res.json().catch(() => ({}));
    const redirect =
      (json as { data?: { gateway?: { redirect_url?: string } } })?.data?.gateway?.redirect_url;
    if (!redirect) throw new Error("OnePay did not return a redirect URL");
    return { mode: "redirect", url: redirect };
  },

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookResult | null> {
    let body: {
      transaction_id?: string;
      status?: number | string;
      additional_data?: string;
      reference?: string;
      hash?: string;
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    const reference = body.reference ?? body.additional_data;
    if (!reference) return null;
    const salt = e("ONEPAY_HASH_SALT");
    const sig = headers.get("x-onepay-signature") ?? body.hash ?? "";
    const verified = Boolean(salt && sig) && safeEqual(hmacSha256Hex(rawBody, salt!), sig);
    const paid = String(body.status) === "1" || String(body.status).toUpperCase() === "SUCCESS";
    return {
      reference,
      providerRef: body.transaction_id,
      status: paid ? "PAID" : "FAILED",
      verified,
    };
  },
};
