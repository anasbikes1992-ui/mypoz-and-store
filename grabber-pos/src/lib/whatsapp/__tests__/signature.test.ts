import { describe, expect, it } from "vitest";
import { verifyWhatsAppSignature, whatsappSignatureHex } from "../signature";

describe("WhatsApp webhook signature", () => {
  it("accepts a matching sha256 HMAC", () => {
    const secret = "test-app-secret";
    const raw = '{"object":"whatsapp_business_account"}';
    const hex = whatsappSignatureHex(raw, secret);
    expect(verifyWhatsAppSignature(raw, `sha256=${hex}`, secret)).toBe(true);
  });

  it("rejects missing secret or header", () => {
    expect(verifyWhatsAppSignature("{}", "sha256=abcd", null)).toBe(false);
    expect(verifyWhatsAppSignature("{}", null, "secret")).toBe(false);
    expect(verifyWhatsAppSignature("{}", "sha256=deadbeef", "secret")).toBe(false);
  });
});
