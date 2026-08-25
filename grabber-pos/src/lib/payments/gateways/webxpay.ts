import { publicEncrypt, publicDecrypt, constants } from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentAdapter, PayStatus, WebhookResult } from "./types";
import { toMajor } from "./types";

/**
 * WEBXPAY Redirect Integration (v3)
 * Docs: https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html
 *
 * Staging POST: https://stagingxpay.info/index.php?route=checkout/billing
 * Live POST:    https://webxpay.com/index.php?route=checkout/billing
 *
 * Set WEBXPAY_PUBLIC_KEY + WEBXPAY_SECRET_KEY from merchant dashboard
 * (Settings → Integration Information → Generate keys).
 * Set Return URL in WebXPay dashboard to:
 *   {APP_URL}/api/payments/webhook/WEBXPAY
 *
 * WEBXPAY_ENV=staging|live (default staging until live credentials are approved).
 * Optional override: WEBXPAY_GATEWAY_URL
 */

function e(k: string) {
  return process.env[k];
}

export const WEBXPAY_STAGING_URL =
  "https://stagingxpay.info/index.php?route=checkout/billing";
export const WEBXPAY_LIVE_URL =
  "https://webxpay.com/index.php?route=checkout/billing";

export function webxpayEnvironment(): "staging" | "live" {
  const explicit = (e("WEBXPAY_ENV") || "").toLowerCase();
  if (explicit === "live" || explicit === "production") return "live";
  if (explicit === "staging" || explicit === "test") return "staging";
  const url = e("WEBXPAY_GATEWAY_URL") || "";
  if (url.includes("webxpay.com") && !url.includes("staging")) return "live";
  return "staging";
}

export function webxpayGatewayUrl(): string {
  const override = e("WEBXPAY_GATEWAY_URL")?.trim();
  if (override) return override;
  return webxpayEnvironment() === "live" ? WEBXPAY_LIVE_URL : WEBXPAY_STAGING_URL;
}

export function webxpayConfigured(): boolean {
  return Boolean(e("WEBXPAY_SECRET_KEY")?.trim() && e("WEBXPAY_PUBLIC_KEY")?.trim());
}

function normalizePem(key: string): string {
  let trimmed = key.trim().replace(/\\n/g, "\n");
  if (!trimmed.includes("\n") && /BEGIN [\w ]+ KEY/.test(trimmed)) {
    const match = trimmed.match(
      /-----BEGIN ([\w ]+ KEY)-----([\s\S]+?)-----END \1-----/,
    );
    if (match) {
      const kind = match[1];
      const body = match[2].replace(/\s+/g, "");
      const lines = body.match(/.{1,64}/g) ?? [body];
      trimmed = `-----BEGIN ${kind}-----\n${lines.join("\n")}\n-----END ${kind}-----`;
    }
  }
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

function mapStatus(code: string): PayStatus {
  if (code === "0" || code === "00") return "PAID";
  if (!code) return "PENDING";
  // 15 = declined per WebXPay guide
  return "FAILED";
}

export const webxpayAdapter: PaymentAdapter = {
  key: "WEBXPAY",
  currencies: ["LKR"],
  configured: () => webxpayConfigured(),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const publicKey = e("WEBXPAY_PUBLIC_KEY");
    const secretKey = e("WEBXPAY_SECRET_KEY");
    const gatewayUrl = webxpayGatewayUrl();
    if (!publicKey || !secretKey) throw new Error("WebXPay not configured");

    const amount = toMajor(input.amountMinor).toFixed(2);
    // Official payment param: unique_order_id|total_amount → RSA public encrypt → base64
    const encrypted = publicEncrypt(
      { key: normalizePem(publicKey), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(`${input.reference}|${amount}`),
    );
    const [firstName, ...rest] = input.customer.name.trim().split(/\s+/);
    const phone = (input.customer.phone ?? "0770000000").replace(/[^\d+]/g, "");
    return {
      mode: "form",
      formAction: gatewayUrl,
      formFields: {
        first_name: (firstName || "Customer").slice(0, 30),
        last_name: (rest.join(" ") || "-").slice(0, 30),
        email: input.customer.email,
        contact_number: phone.length >= 9 ? phone.slice(0, 20) : "0770000000",
        address_line_one: "Sri Lanka",
        // Guide lists cms as mandatory (PHP, WooCommerce, …)
        cms: "PHP",
        process_currency: input.currency,
        secret_key: secretKey,
        // Guide §2.5/2.7: custom_fields = base64(param1|param2|…)
        // Guide §2.2 table typo "custom_feilds" — send both for staging compatibility
        custom_fields: Buffer.from(input.reference).toString("base64"),
        custom_feilds: Buffer.from(input.reference).toString("base64"),
        payment: encrypted.toString("base64"),
      },
    };
  },

  async verifyWebhook(_headers: Headers, rawBody: string): Promise<WebhookResult | null> {
    const publicKey = e("WEBXPAY_PUBLIC_KEY");
    if (!publicKey) return null;
    const params = new URLSearchParams(rawBody);
    const paymentB64 = params.get("payment");
    const signatureB64 = params.get("signature");
    if (!paymentB64 || !signatureB64) return null;

    let paymentBuf: Buffer;
    let signatureBuf: Buffer;
    try {
      paymentBuf = Buffer.from(paymentB64, "base64");
      signatureBuf = Buffer.from(signatureB64, "base64");
    } catch {
      return null;
    }

    const key = normalizePem(publicKey);
    let decryptedSig: Buffer;
    try {
      decryptedSig = publicDecrypt(
        { key, padding: constants.RSA_PKCS1_PADDING },
        signatureBuf,
      );
    } catch {
      return null;
    }

    let decryptedPayment: Buffer | null = null;
    try {
      decryptedPayment = publicDecrypt(
        { key, padding: constants.RSA_PKCS1_PADDING },
        paymentBuf,
      );
    } catch {
      decryptedPayment = null;
    }

    // Guide: compare decoded payment against decrypted signature
    const verified =
      (decryptedPayment && decryptedSig.equals(decryptedPayment)) ||
      decryptedSig.equals(paymentBuf);
    if (!verified) {
      return {
        reference: "unknown",
        status: "FAILED",
        verified: false,
      };
    }

    const plaintext = (decryptedPayment ?? paymentBuf).toString("utf8");
    // order_id|order_reference|date_time|status_code|comment|payment_gateway_used
    const parts = plaintext.split("|");
    const orderId = parts[0]?.trim();
    if (!orderId) return null;
    let statusCode = parts[3]?.trim() ?? "";
    let providerRef = parts[1]?.trim() || parts[5]?.trim();
    if (statusCode.length > 3 && parts[4]) {
      providerRef = parts[3]?.trim();
      statusCode = parts[4]?.trim() ?? "";
    }

    const customB64 = params.get("custom_fields") ?? params.get("custom_feilds");
    const customRef = customB64
      ? Buffer.from(customB64, "base64").toString("utf8").split("|")[0]
      : undefined;

    return {
      reference: customRef || orderId,
      providerRef,
      status: mapStatus(statusCode),
      verified: true,
      amountMinor: undefined,
    };
  },
};
