/** Wholesale / customer price tiers for POS. */

export const PRICE_TIERS = ["retail", "wholesale", "vip"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export function isPriceTier(v: unknown): v is PriceTier {
  return PRICE_TIERS.includes(v as PriceTier);
}

export function normalizePriceTier(v: unknown): PriceTier {
  return isPriceTier(v) ? v : "retail";
}

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  vip: "VIP",
};

/** Resolve catalog unit price for a tier (falls back sensibly). */
export function resolveTierUnitPrice(opts: {
  tier: PriceTier;
  salePrice: number;
  wholesalePrice?: number | null;
  vipPrice?: number | null;
}): number {
  const sale = Number(opts.salePrice) || 0;
  const ws =
    opts.wholesalePrice != null && Number.isFinite(Number(opts.wholesalePrice))
      ? Number(opts.wholesalePrice)
      : null;
  const vip =
    opts.vipPrice != null && Number.isFinite(Number(opts.vipPrice))
      ? Number(opts.vipPrice)
      : null;

  if (opts.tier === "vip") {
    if (vip != null) return vip;
    if (ws != null) return ws;
    return sale;
  }
  if (opts.tier === "wholesale") {
    if (ws != null) return ws;
    return sale;
  }
  return sale;
}

/** Effective tier when POS wholesale mode is on and/or customer has a tier. */
export function resolveActiveTier(opts: {
  isWholesaleMode: boolean;
  customerTier?: PriceTier | null;
}): PriceTier {
  if (opts.customerTier === "vip") return "vip";
  if (opts.customerTier === "wholesale" || opts.isWholesaleMode) {
    return "wholesale";
  }
  if (opts.customerTier === "retail") return "retail";
  return opts.isWholesaleMode ? "wholesale" : "retail";
}

export function moqShortfall(
  quantity: number,
  minWholesaleQty: number | null | undefined,
): number {
  const moq = Math.max(0, Math.floor(Number(minWholesaleQty) || 0));
  if (moq <= 1) return 0;
  const qty = Math.max(0, Number(quantity) || 0);
  return qty < moq ? moq - qty : 0;
}

export const WHOLESALE_QTY_PRESETS = [6, 12, 24, 48] as const;
