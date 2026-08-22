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

/** Meta system-user tokens start with EAA and are long (not verify tokens / passwords). */
export function isValidMetaAccessToken(value: string): boolean {
  const v = value.trim();
  return v.length >= 50 && /^EAA[A-Za-z0-9]+$/.test(v);
}

export function readStoredMetaAccessToken(raw: unknown): string {
  const v = String(raw ?? "").trim();
  return isValidMetaAccessToken(v) ? v : "";
}

export function normalizeMetaAccessToken(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "";
  if (!isValidMetaAccessToken(value)) {
    throw new Error(
      "Access token must be the Meta system-user token from WhatsApp → API Setup (starts with EAA). Do not paste the verify token here.",
    );
  }
  return value;
}

/** Org override when valid; otherwise platform env token. */
export function resolveMetaAccessToken(orgToken: unknown): string | undefined {
  const org = readStoredMetaAccessToken(orgToken);
  if (org) return org;
  const env = String(process.env.WHATSAPP_TOKEN ?? "").trim();
  return isValidMetaAccessToken(env) ? env : undefined;
}
