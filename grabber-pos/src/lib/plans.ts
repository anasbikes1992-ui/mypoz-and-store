export type PlanTier = "starter" | "business" | "enterprise";

export interface Brand {
  businessName: string;
  logoUrl: string;
  accentColor: string;
}
export interface License {
  plan: PlanTier;
  expiry: string;
  /** Extra module keys enabled on top of the plan (per-client add-ons). */
  extras: string[];
  /** HQ suspend flag — blocks tenant as suspended even if expiry is future. */
  suspended?: boolean;
}
export interface TenantConfig {
  brand: Brand;
  license: License;
}

export const DEFAULT_TENANT: TenantConfig = {
  brand: { businessName: "MyPoz", logoUrl: "", accentColor: "" },
  license: { plan: "enterprise", expiry: "", extras: [] },
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  starter: "Starter",
  business: "Business",
  enterprise: "Enterprise",
};

/** Sale-mode verticals — Enterprise-only unless added as an extra. */
export const VERTICAL_KEYS = [
  "category",
  "restaurant",
  "kds",
  "tables",
  "delivery",
  "drivers",
  "repair",
  "service",
  "reloads",
  "rooms",
  "rent",
  "hire",
  "play",
  "layaway",
  "click-collect",
  "digital",
];

/**
 * Thin / experimental verticals quarantined from the launcher until coverage
 * is ready. Routes may still exist; tiles are status "soon" in modules.ts.
 * Also stripped from planEnabledKeys unless POS_SHOW_QUARANTINED_VERTICALS=true.
 */
export const QUARANTINED_VERTICAL_KEYS = [
  "rooms",
  "rent",
  "hire",
] as const;

/**
 * When HQ enables a primary vertical extra, companion modules unlock with it
 * so grocery tenants never see restaurant floor / KDS / drivers alone.
 */
export const VERTICAL_BUNDLES: Record<string, readonly string[]> = {
  restaurant: ["restaurant", "kds", "tables"],
  delivery: ["delivery", "drivers"],
};

export function expandExtras(extras: string[]): string[] {
  const out = new Set<string>();
  for (const key of extras) {
    const bundle = VERTICAL_BUNDLES[key];
    if (bundle) bundle.forEach((k) => out.add(k));
    else out.add(key);
  }
  return [...out];
}

/** The lean Starter set (core POS + basics). */
export const STARTER_KEYS = [
  "retail",
  "wholesale",
  "products",
  "categories",
  "inventory",
  "sales",
  "dashboard",
  "reports",
  "settings",
  "commerce",
  "commerce-onboarding",
  "commerce-builder",
  "commerce-themes",
  "commerce-orders",
  "commerce-analytics",
  "commerce-collections",
  "commerce-discounts",
  "commerce-media",
  "commerce-domains",
  "alerts",
  // Cashier ops available on every paid plan.
  "register",
  // Reseller console stays reachable on every plan so lowering a client's
  // plan can never lock the operator out of the licensing controls.
  "admin",
  "clients",
  "backup",
  "assistant",
  "approvals",
  // In-app help must reach every client, whatever they pay.
  "help",
  "billing",
  "observability",
];

/** Resolve the enabled module keys for a plan (+ per-client extras). */
export function planEnabledKeys(
  plan: PlanTier,
  allKeys: string[],
  extras: string[] = [],
): Set<string> {
  const expanded = expandExtras(extras);
  let keys: Set<string>;
  if (plan === "enterprise") {
    keys = new Set(allKeys);
  } else if (plan === "business") {
    keys = new Set([
      ...allKeys.filter((k) => !VERTICAL_KEYS.includes(k)),
      ...expanded,
    ]);
  } else {
    keys = new Set([...STARTER_KEYS, ...expanded]);
  }
  if (process.env.POS_SHOW_QUARANTINED_VERTICALS !== "true") {
    for (const k of QUARANTINED_VERTICAL_KEYS) keys.delete(k);
  }
  return keys;
}

export function isLicenseExpired(expiry: string): boolean {
  if (!expiry) return false;
  const t = new Date(expiry).getTime();
  return !Number.isNaN(t) && t < Date.now();
}
