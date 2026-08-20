import "server-only";
import {
  DEFAULT_TENANT,
  type TenantConfig,
  type PlanTier,
} from "@/lib/plans";
import { docStore } from "./persistence/doc-store";

/**
 * White-label + licence config. Local backend: data/tenant.json. Durable
 * backend: app_documents where key = 'tenant', one row per organization, so each
 * client carries its own branding and plan.
 */
const store = docStore<Partial<TenantConfig>>({
  key: "tenant",
  file: "tenant.json",
});

const PLANS: PlanTier[] = ["starter", "business", "enterprise"];

export async function readTenant(): Promise<TenantConfig> {
  const raw = await store.read(DEFAULT_TENANT);
  return {
    brand: { ...DEFAULT_TENANT.brand, ...raw.brand },
    license: {
      ...DEFAULT_TENANT.license,
      ...raw.license,
      suspended: Boolean(raw.license?.suspended ?? DEFAULT_TENANT.license.suspended),
    },
  };
}

export async function writeTenant(input: {
  brand?: Partial<TenantConfig["brand"]>;
  license?: Partial<TenantConfig["license"]>;
}): Promise<TenantConfig> {
  const current = await readTenant();
  const plan =
    input.license?.plan && PLANS.includes(input.license.plan)
      ? input.license.plan
      : current.license.plan;
  const next: TenantConfig = {
    brand: {
      businessName: (input.brand?.businessName ?? current.brand.businessName).slice(0, 120),
      logoUrl: (input.brand?.logoUrl ?? current.brand.logoUrl).slice(0, 500),
      accentColor: (input.brand?.accentColor ?? current.brand.accentColor).slice(0, 32),
    },
    license: {
      plan,
      expiry: (input.license?.expiry ?? current.license.expiry).slice(0, 20),
      extras: Array.isArray(input.license?.extras)
        ? input.license.extras
        : current.license.extras,
      suspended:
        input.license?.suspended !== undefined
          ? Boolean(input.license.suspended)
          : current.license.suspended,
    },
  };
  await store.write(next);
  return next;
}
