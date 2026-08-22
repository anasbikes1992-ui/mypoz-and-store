/** Meta Cloud API phone_number_id — digits only (rejects emails/autofill). */
export function sanitizeMetaPhoneNumberIdInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 20);
}

export function isValidMetaPhoneNumberId(value: string): boolean {
  return /^\d{10,20}$/.test(value.trim());
}

export function readStoredMetaPhoneNumberId(raw: unknown): string {
  const phoneRaw = String(raw ?? "").trim();
  return isValidMetaPhoneNumberId(phoneRaw) ? phoneRaw : "";
}

export function normalizeMetaPhoneNumberId(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (!isValidMetaPhoneNumberId(value)) {
    throw new Error(
      "Phone number id must be the numeric Meta WhatsApp phone number id (digits only, no email).",
    );
  }
  return value;
}
