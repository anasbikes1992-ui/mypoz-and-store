import { z } from "zod";

/** Normalize Sri Lankan mobile numbers to E.164 (+94…). Returns null if invalid. */
export function normalizeLkPhone(input: string | undefined | null): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;

  let national = digits;
  if (digits.startsWith("0094")) national = digits.slice(4);
  else if (digits.startsWith("94")) national = digits.slice(2);
  else if (digits.startsWith("0")) national = digits.slice(1);

  if (!/^7\d{8}$/.test(national)) return null;
  return `+94${national}`;
}

export function isLkPhone(input: string | undefined | null): boolean {
  return normalizeLkPhone(input) !== null;
}

/**
 * Optional storefront / settings WhatsApp contact.
 * Rejects emails (browser autofill) and non-LK mobiles; empty stays empty.
 */
export const optionalLkWhatsAppContact = z
  .string()
  .max(40)
  .default("")
  .transform((raw, ctx) => {
    const s = raw.trim();
    if (!s) return "";
    if (s.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "WhatsApp contact must be a mobile number (e.g. 077 959 2288), not an email.",
      });
      return z.NEVER;
    }
    const normalized = normalizeLkPhone(s);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Enter a valid Sri Lankan mobile (07XXXXXXXX or +94 7XXXXXXXX).",
      });
      return z.NEVER;
    }
    return normalized;
  });
