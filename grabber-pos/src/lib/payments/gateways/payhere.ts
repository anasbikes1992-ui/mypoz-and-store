import type { CheckoutInput, CheckoutResult, PaymentAdapter, PayStatus, WebhookResult } from "./types";
import { toMajor } from "./types";
import { md5Hex, safeEqual } from "./sig";

function e(k: string) {
  return process.env[k];
}

function mapStatus(code: string): PayStatus {
  switch (code) {
    case "2":
      return "PAID";
    case "0":
      return "PENDING";
    case "-1":
      return "CANCELLED";
    case "-3":
      return "REFUNDED";
    default:
      return "FAILED";
  }
}

export const payhereAdapter: PaymentAdapter = {
  key: "PAYHERE",
  currencies: ["LKR", "USD"],
  configured: () => Boolean(e("PAYHERE_MERCHANT_ID") && e("PAYHERE_MERCHANT_SECRET")),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const merchantId = e("PAYHERE_MERCHANT_ID");
    const merchantSecret = e("PAYHERE_MERCHANT_SECRET");
    if (!merchantId || !merchantSecret) throw new Error("PayHere not configured");
    const amount = toMajor(input.amountMinor).toFixed(2);
    const secretHash = md5Hex(merchantSecret).toUpperCase();
    const hash = md5Hex(`${merchantId}${input.reference}${amount}${input.currency}${secretHash}`).toUpperCase();
    const sandbox = (e("PAYHERE_SANDBOX") ?? "true") === "true";
    const checkoutUrl = sandbox
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout";
    const [firstName, ...rest] = input.customer.name.split(" ");
    const appUrl = (e("NEXT_PUBLIC_APP_URL") || "").replace(/\/$/, "");
    return {
      mode: "form",
      formAction: checkoutUrl,
      formFields: {
        merchant_id: merchantId,
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
        notify_url: appUrl ? `${appUrl}/api/payments/webhook/PAYHERE` : "",
        order_id: input.reference,
        items: input.description,
        currency: input.currency,
        amount,
        first_name: firstName ?? input.customer.name,
        last_name: rest.join(" ") || "-",
        email: input.customer.email,
        phone: input.customer.phone ?? "",
        hash,
      },
    };
  },

  async verifyWebhook(_headers: Headers, rawBody: string): Promise<WebhookResult | null> {
    const merchantSecret = e("PAYHERE_MERCHANT_SECRET");
    const p = new URLSearchParams(rawBody);
    const merchantId = p.get("merchant_id");
    const reference = p.get("order_id");
    const amount = p.get("payhere_amount");
    const currency = p.get("payhere_currency");
    const statusCode = p.get("status_code");
    const md5sig = p.get("md5sig");
    if (!reference || !merchantId || !statusCode) return null;
    let verified = false;
    if (merchantSecret && md5sig && amount && currency) {
      const secretHash = md5Hex(merchantSecret).toUpperCase();
      const local = md5Hex(
        `${merchantId}${reference}${amount}${currency}${statusCode}${secretHash}`,
      ).toUpperCase();
      verified = safeEqual(local, md5sig.toUpperCase());
    }
    return {
      reference,
      providerRef: p.get("payment_id") ?? undefined,
      status: mapStatus(statusCode),
      verified,
      amountMinor: amount ? Math.round(Number(amount) * 100) : undefined,
      currency: (currency as WebhookResult["currency"]) ?? undefined,
    };
  },
};
