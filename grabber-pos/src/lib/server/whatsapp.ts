import "server-only";
import { createHmac } from "crypto";

/**
 * WhatsApp Business Cloud API sender for invoice PDFs.
 *
 * Credentials come from the environment (never stored in the app):
 *   WHATSAPP_TOKEN            — permanent/system access token
 *   WHATSAPP_PHONE_NUMBER_ID  — the sending phone number's ID
 *   WHATSAPP_APP_SECRET       — required when Meta enforces appsecret_proof
 *   WHATSAPP_API_VERSION      — optional, defaults to v21.0
 *
 * Flow: upload the PDF to the media endpoint, then send a document message.
 */
const GRAPH = "https://graph.facebook.com";

export class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super(
      "WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
    );
    this.name = "WhatsAppNotConfiguredError";
  }
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

/** Meta requires HMAC(token, app_secret) when "Require app secret" is on. */
function graphUrl(path: string, token: string): string {
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!secret) return path;
  const proof = createHmac("sha256", secret).update(token).digest("hex");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}appsecret_proof=${proof}`;
}

/** Normalize a local mobile number to E.164 digits using a default country code. */
export function normalizeMobile(input: string, countryCode = "94"): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  if (!digits.startsWith(countryCode) && digits.length <= 9) {
    digits = countryCode + digits;
  }
  return digits;
}

interface SendResult {
  messageId: string;
}

export async function sendInvoiceViaWhatsApp(opts: {
  to: string;
  pdf: Uint8Array;
  filename: string;
  caption: string;
  /** Optional org override (else platform env). */
  token?: string;
  phoneNumberId?: string;
}): Promise<SendResult> {
  const token = opts.token || process.env.WHATSAPP_TOKEN;
  const phoneNumberId =
    opts.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  if (!token || !phoneNumberId) throw new WhatsAppNotConfiguredError();

  // 1) Upload the PDF as media.
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append(
    "file",
    new Blob([opts.pdf as BlobPart], { type: "application/pdf" }),
    opts.filename,
  );

  const uploadRes = await fetch(
    graphUrl(`${GRAPH}/${version}/${phoneNumberId}/media`, token),
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  const uploadJson = await uploadRes.json();
  if (!uploadRes.ok || !uploadJson.id) {
    throw new Error(
      `WhatsApp media upload failed: ${uploadJson?.error?.message ?? uploadRes.status}`,
    );
  }

  // 2) Send the document message.
  const sendRes = await fetch(
    graphUrl(`${GRAPH}/${version}/${phoneNumberId}/messages`, token),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.to,
        type: "document",
        document: {
          id: uploadJson.id,
          filename: opts.filename,
          caption: opts.caption,
        },
      }),
    },
  );
  const sendJson = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(
      `WhatsApp send failed: ${sendJson?.error?.message ?? sendRes.status}`,
    );
  }
  return { messageId: sendJson.messages?.[0]?.id ?? "sent" };
}

export async function sendWhatsAppText(opts: {
  to: string;
  body: string;
  token?: string;
  phoneNumberId?: string;
}): Promise<{ messageId: string }> {
  const token = opts.token || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = opts.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  if (!token || !phoneNumberId) throw new WhatsAppNotConfiguredError();

  const to = opts.to.replace(/[^\d]/g, "");
  const sendRes = await fetch(
    graphUrl(`${GRAPH}/${version}/${phoneNumberId}/messages`, token),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: opts.body.slice(0, 4096) },
      }),
    },
  );
  const sendJson = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(
      `WhatsApp send failed: ${sendJson?.error?.message ?? sendRes.status}`,
    );
  }
  return { messageId: sendJson.messages?.[0]?.id ?? "sent" };
}

export async function notifyWhatsAppOrderStatus(opts: {
  to: string;
  receipt: string;
  status: string;
  orgId?: string;
  customerName?: string;
}): Promise<void> {
  if (!opts.to.trim()) return;
  try {
    const { dispatchFulfillmentWhatsApp } = await import(
      "@/lib/server/whatsapp-events"
    );
    await dispatchFulfillmentWhatsApp({
      to: opts.to,
      receipt: opts.receipt,
      status: opts.status,
      orgId: opts.orgId,
      customerName: opts.customerName,
    });
  } catch {
    // Status ping is best-effort — never block fulfillment.
  }
}
