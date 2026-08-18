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
  "delivery",
  "repair",
  "service",
  "reloads",
  "rooms",
  "rent",
  "hire",
  "play",
  "layaway",
  "click-collect",
];

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
  "website",
  "commerce",
  "commerce-builder",
  "commerce-themes",
  "commerce-orders",
  "commerce-analytics",
  "alerts",
  // Cashier ops available on every paid plan.
  "register",
  // Reseller console stays reachable on every plan so lowering a client's
  // plan can never lock the operator out of the licensing controls.
  "admin",
  "clients",
  // In-app help must reach every client, whatever they pay.
  "help",
];

/** Resolve the enabled module keys for a plan (+ per-client extras). */
export function planEnabledKeys(
  plan: PlanTier,
  allKeys: string[],
  extras: string[] = [],
): Set<string> {
  if (plan === "enterprise") return new Set(allKeys);
  if (plan === "business") {
    return new Set([
      ...allKeys.filter((k) => !VERTICAL_KEYS.includes(k)),
      ...extras,
    ]);
  }
  return new Set([...STARTER_KEYS, ...extras]);
}

export function isLicenseExpired(expiry: string): boolean {
  if (!expiry) return false;
  const t = new Date(expiry).getTime();
  return !Number.isNaN(t) && t < Date.now();
}
