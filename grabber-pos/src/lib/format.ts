const LKR = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return LKR.format(amount);
}

/**
 * Compact money for dashboard stat cards where space is limited.
 * 1,250,000 → "Rs 1.25M"   |   9,957,925,131 → "Rs 9.96B"
 */
export function formatMoneyCompact(amount: number): string {
  if (amount === 0) return "Rs 0";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `Rs ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `Rs ${(amount / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `Rs ${(amount / 1_000).toFixed(1)}K`;
  return LKR.format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EXPIRY_WARNING_DAYS = 30;

export function expiryStatus(
  iso: string | null,
): "ok" | "expiring" | "expired" | "none" {
  if (!iso) return "none";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "none";
  const diffDays = (d.getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return "expired";
  if (diffDays <= EXPIRY_WARNING_DAYS) return "expiring";
  return "ok";
}
