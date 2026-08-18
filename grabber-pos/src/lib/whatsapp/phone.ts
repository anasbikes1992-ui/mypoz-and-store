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
