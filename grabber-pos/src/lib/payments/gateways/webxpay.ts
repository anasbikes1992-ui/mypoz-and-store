import { publicEncrypt, publicDecrypt, constants } from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentAdapter, PayStatus, WebhookResult } from "./types";
import { toMajor } from "./types";

function e(k: string) {
  return process.env[k];
}

const STAGING_URL = "https://stagingxpay.info/index.php?route=checkout/billing";

function normalizePem(key: string): string {
  let trimmed = key.trim().replace(/\\n/g, "\n");
  // Vercel / .env often flatten PEM to one line — rebuild a valid PKCS#1/SPKI block.
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
  return "FAILED";
}

export const webxpayAdapter: PaymentAdapter = {
  key: "WEBXPAY",
  currencies: ["LKR"],
  configured: () => Boolean(e("WEBXPAY_SECRET_KEY") && e("WEBXPAY_PUBLIC_KEY")),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const publicKey = e("WEBXPAY_PUBLIC_KEY");
    const secretKey = e("WEBXPAY_SECRET_KEY");
    const gatewayUrl = e("WEBXPAY_GATEWAY_URL") || STAGING_URL;
    if (!publicKey || !secretKey) throw new Error("WebXPay not configured");

    const amount = toMajor(input.amountMinor).toFixed(2);
    // Official: unique_order_id|total_amount
    const encrypted = publicEncrypt(
      { key: normalizePem(publicKey), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(`${input.reference}|${amount}`),
    );
    const [firstName, ...rest] = input.customer.name.split(" ");
    const phone = (input.customer.phone ?? "0770000000").replace(/[^\d+]/g, "");
    return {
      mode: "form",
      formAction: gatewayUrl,
      formFields: {
        first_name: (firstName ?? input.customer.name).slice(0, 30),
        last_name: (rest.join(" ") || "-").slice(0, 30),
        email: input.customer.email,
        contact_number: phone.length >= 9 ? phone : "0770000000",
        address_line_one: "Sri Lanka",
        cms: "NextJS",
        process_currency: input.currency,
        secret_key: secretKey,
        custom_fields: Buffer.from(input.reference).toString("base64"),
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

    const verified =
      (decryptedPayment && decryptedSig.equals(decryptedPayment)) ||
      decryptedSig.equals(paymentBuf);
    if (!verified) return null;

    const plaintext = (decryptedPayment ?? paymentBuf).toString("utf8");
    const parts = plaintext.split("|");
    const orderId = parts[0]?.trim();
    if (!orderId) return null;
    let statusCode = parts[3]?.trim() ?? "";
    let providerRef = parts[5]?.trim() || parts[1]?.trim();
    if (statusCode.length > 3 && parts[4]) {
      providerRef = parts[3]?.trim();
      statusCode = parts[4]?.trim() ?? "";
    }

    const customB64 = params.get("custom_fields");
    const customRef = customB64
      ? Buffer.from(customB64, "base64").toString("utf8").split("|")[0]
      : undefined;

    return {
      reference: customRef || orderId,
      providerRef,
      status: mapStatus(statusCode),
      verified: true,
    };
  },
};
