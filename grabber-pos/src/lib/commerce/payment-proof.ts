/** Max encoded proof string (~1.5MB). Data URLs are larger than the raw file. */
export const PAYMENT_PROOF_MAX_CHARS = 1_500_000;

export type PaymentProofStatus = "none" | "submitted" | "approved" | "rejected";

const DATA_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

/**
 * Accepts https image URLs or image data URLs within the size cap.
 */
export function isValidPaymentProofUrl(url: string): boolean {
  const v = url.trim();
  if (!v || v.length > PAYMENT_PROOF_MAX_CHARS) return false;
  if (v.startsWith("https://")) return v.length >= 12;
  if (v.startsWith("data:image/")) return DATA_IMAGE_RE.test(v);
  return false;
}

/** Status to stamp when a bank-transfer order is placed. */
export function initialPaymentProofStatus(
  paymentMethod: string,
  paymentProofUrl?: string | null,
): PaymentProofStatus | undefined {
  if (paymentMethod !== "bank_transfer") return undefined;
  return paymentProofUrl ? "submitted" : "none";
}
