/** Normalize mobile to E.164 digits for matching (default LK +94). */
export function normalizeCustomerMobile(
  input: string | null | undefined,
  countryCode = "94",
): string {
  if (!input) return "";
  let digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) digits = countryCode + digits.slice(1);
  if (!digits.startsWith(countryCode) && digits.length <= 9) {
    digits = countryCode + digits;
  }
  return digits;
}

/** Compare two mobiles after normalization (last-9 fallback for format drift). */
export function mobilesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeCustomerMobile(a);
  const nb = normalizeCustomerMobile(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tail = (s: string) => s.slice(-9);
  const ta = tail(na);
  const tb = tail(nb);
  return ta.length >= 9 && ta === tb;
}
