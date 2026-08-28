import type { PlanTier } from "@/lib/plans";

/** Starter tenants show platform branding; Business+ can white-label. */
export function shouldShowPlatformBranding(plan: PlanTier): boolean {
  return plan === "starter";
}
