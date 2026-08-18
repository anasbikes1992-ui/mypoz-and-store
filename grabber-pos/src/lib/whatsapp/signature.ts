import { createHmac } from "node:crypto";
import { hmacSha256Hex, safeEqual } from "@/lib/payments/gateways/sig";

/** Fail-closed X-Hub-Signature-256 check for WhatsApp Cloud API webhooks. */
export function verifyWhatsAppSignature(
  rawBody: string,
  header: string | null | undefined,
  appSecret: string | undefined | null,
): boolean {
  if (!appSecret) return false;
  if (!header?.startsWith("sha256=")) return false;
  const expected = hmacSha256Hex(rawBody, appSecret);
  const given = header.slice("sha256=".length);
  return safeEqual(expected.toLowerCase(), given.toLowerCase());
}

export function whatsappSignatureHex(rawBody: string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(rawBody).digest("hex");
}
