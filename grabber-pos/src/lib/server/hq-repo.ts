import "server-only";
import { randomUUID } from "crypto";
import {
  HQ_DOC_PAGES,
  licenceStatus,
  type HqSummary,
  type HqTenant,
  type HqTenantBrand,
  type HqTicket,
} from "@/lib/hq";
import {
  DEFAULT_TENANT,
  type PlanTier,
  type TenantConfig,
} from "@/lib/plans";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  createEntity,
  deleteEntity,
  listCollection,
  updateEntity,
} from "@/lib/server/collection-store";
import { readTenant, writeTenant } from "@/lib/server/tenant-store";
import { getHqFleetPulse } from "@/lib/server/hq-monitor";
import { dataFile, readJsonFile, writeJsonFile } from "@/lib/server/persistence/local-json";
import { slugifyOrgName } from "@/lib/org-slug";
import { isReservedStorefrontSlug } from "@/lib/store-slug-aliases";

export { slugifyOrgName } from "@/lib/org-slug";

const TICKETS_FILE = dataFile("hq-tickets.json");
const TICKETS_ROW_KEY = "hq-tickets";
const LOCAL_TENANT_ID = "local";

async function ticketsFromTable(): Promise<HqTicket[] | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("platform_settings")
      .select("data")
      .eq("key", TICKETS_ROW_KEY)
      .maybeSingle();
    if (error) return null;
    if (!data?.data) return [];
    return Array.isArray(data.data)
      ? (data.data as unknown as HqTicket[])
      : [];
  } catch {
    return null;
  }
}

async function ticketsToTable(items: HqTicket[]): Promise<boolean> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const db = createServiceSupabase();
    const { error } = await db.from("platform_settings").upsert({
      key: TICKETS_ROW_KEY,
      data: items as unknown as import("@/lib/supabase/database.types").Json,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

async function persistTickets(items: HqTicket[]): Promise<void> {
  const saved = await ticketsToTable(items);
  if (!saved) await writeJsonFile(TICKETS_FILE, items);
}

type ResellerLicenceRow = {
  org_id: string;
  org_name: string;
  onboarded_at: string | null;
  brand: HqTenantBrand | null;
  plan: string | null;
  expiry: string | null;
  branches: number | null;
  users: number | null;
  sales_count: number | null;
  sales_total: number | null;
};

function asPlan(raw: string | null | undefined): PlanTier | string {
  const p = (raw ?? "starter").toLowerCase();
  if (p === "starter" || p === "business" || p === "enterprise") return p;
  return raw || "starter";
}

function brandFromUnknown(raw: unknown): HqTenantBrand | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  return {
    businessName: String(b.businessName ?? ""),
    logoUrl: String(b.logoUrl ?? ""),
    accentColor: String(b.accentColor ?? ""),
  };
}

function fromResellerRow(row: ResellerLicenceRow): HqTenant {
  const expiry = row.expiry || null;
  return {
    id: row.org_id,
    name: row.org_name || "Unnamed org",
    plan: asPlan(row.plan),
    expiry,
    onboardedAt: row.onboarded_at,
    branches: Number(row.branches ?? 0),
    users: Number(row.users ?? 0),
    salesCount: Number(row.sales_count ?? 0),
    salesTotal: Number(row.sales_total ?? 0),
    brand: brandFromUnknown(row.brand),
    status: licenceStatus(expiry),
    source: "reseller_licences",
    extras: [],
  };
}

async function loadSuspendedByOrg(
  orgIds: string[],
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!orgIds.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return map;
  try {
    const db = createServiceSupabase();
    const { data } = await db
      .from("app_documents")
      .select("org_id, data")
      .eq("key", "tenant")
      .in("org_id", orgIds);
    for (const row of data ?? []) {
      const suspended = Boolean(
        (row.data as { license?: { suspended?: boolean } } | null)?.license
          ?.suspended,
      );
      if (suspended) map.set(row.org_id as string, true);
    }
  } catch {
    // ignore — treat as not suspended
  }
  return map;
}

async function tryResellerLicences(): Promise<HqTenant[] | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db.from("reseller_licences").select("*");
    if (error) return null;
    const rows = (data ?? []) as unknown as ResellerLicenceRow[];
    const suspendedMap = await loadSuspendedByOrg(rows.map((r) => r.org_id));
    return rows.map((row) => {
      const base = fromResellerRow(row);
      if (suspendedMap.get(row.org_id)) {
        return { ...base, status: licenceStatus(base.expiry, true) };
      }
      return base;
    });
  } catch {
    return null;
  }
}

/** When reseller_licences is empty/broken, still show live organizations. */
async function tryOrganizationsFallback(): Promise<HqTenant[] | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("organizations")
      .select("id, name, slug, created_at")
      .order("name");
    if (error || !data?.length) return null;
    return data.map((o) => ({
      id: o.id,
      name: o.name || o.slug || "Unnamed org",
      plan: "starter" as PlanTier,
      expiry: null,
      onboardedAt: o.created_at ?? null,
      branches: 0,
      users: 0,
      salesCount: 0,
      salesTotal: 0,
      brand: { businessName: o.name || "", logoUrl: "", accentColor: "" },
      status: licenceStatus(null),
      source: "reseller_licences" as const,
      extras: [],
    }));
  } catch {
    return null;
  }
}

async function demoFleet(): Promise<HqTenant[]> {
  const tenant = await readTenant();
  const clients = await listCollection("clients");
  const local: HqTenant = {
    id: LOCAL_TENANT_ID,
    name: tenant.brand.businessName || "This workspace",
    plan: tenant.license.plan,
    expiry: tenant.license.expiry || null,
    onboardedAt: null,
    branches: 1,
    users: 0,
    salesCount: 0,
    salesTotal: 0,
    brand: {
      businessName: tenant.brand.businessName,
      logoUrl: tenant.brand.logoUrl,
      accentColor: tenant.brand.accentColor,
    },
    status: licenceStatus(
      tenant.license.expiry || null,
      Boolean(tenant.license.suspended),
    ),
    source: "local_tenant",
    extras: Array.isArray(tenant.license.extras) ? tenant.license.extras : [],
  };

  const fromClients: HqTenant[] = clients.map((c) => {
    const expiry = String(c.expiry ?? "") || null;
    const suspended = String(c.status ?? "") === "suspended";
    return {
      id: String(c.id),
      name: String(c.name ?? "Client"),
      contact: String(c.contact ?? ""),
      plan: asPlan(String(c.plan ?? "starter")),
      expiry,
      onboardedAt: String(c.createdAt ?? "") || null,
      branches: 0,
      users: 0,
      salesCount: 0,
      salesTotal: 0,
      brand: null,
      status: licenceStatus(expiry, suspended),
      source: "clients" as const,
      extras: Array.isArray(c.extras) ? c.extras.map(String) : [],
    };
  });

  // Avoid duplicating a client that matches the local workspace name exactly.
  const filtered = fromClients.filter(
    (c) => c.name.toLowerCase() !== local.name.toLowerCase(),
  );
  return [local, ...filtered];
}

export async function listHqTenants(): Promise<{
  tenants: HqTenant[];
  source: HqSummary["source"];
  serviceRole: boolean;
}> {
  const fromView = await tryResellerLicences();
  if (fromView && fromView.length > 0) {
    return {
      tenants: fromView.sort((a, b) => a.name.localeCompare(b.name)),
      source: "reseller_licences",
      serviceRole: true,
    };
  }
  const fromOrgs = await tryOrganizationsFallback();
  if (fromOrgs && fromOrgs.length > 0) {
    return {
      tenants: fromOrgs.sort((a, b) => a.name.localeCompare(b.name)),
      source: "reseller_licences",
      serviceRole: true,
    };
  }
  const tenants = await demoFleet();
  return {
    tenants: tenants.sort((a, b) => a.name.localeCompare(b.name)),
    source: "demo_fallback",
    serviceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export async function getHqTenant(id: string): Promise<HqTenant | null> {
  const { tenants } = await listHqTenants();
  const found = tenants.find((t) => t.id === id) ?? null;
  if (!found) return null;
  if (found.source !== "reseller_licences") return found;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return found;
  try {
    const db = createServiceSupabase();
    const { data } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", id)
      .eq("key", "tenant")
      .maybeSingle();
    const license = (data?.data as { license?: { extras?: unknown; suspended?: boolean } } | null)
      ?.license;
    const extras = license?.extras;
    const suspended = Boolean(license?.suspended);
    return {
      ...found,
      extras: Array.isArray(extras)
        ? extras.map(String).filter((k) => /^[a-z0-9-]{2,40}$/.test(k))
        : found.extras,
      status: licenceStatus(found.expiry, suspended),
    };
  } catch {
    // keep listed extras
  }
  return found;
}

export async function getHqSummary(): Promise<HqSummary> {
  const { tenants, source, serviceRole } = await listHqTenants();
  const tickets = await listHqTickets();
  const pulse = await getHqFleetPulse();
  const salesFromTenants = tenants.reduce((s, t) => s + t.salesTotal, 0);
  return {
    tenantCount: tenants.length,
    expiredCount: tenants.filter((t) => t.status === "expired").length,
    expiringCount: tenants.filter((t) => t.status === "expiring").length,
    salesTotal:
      pulse.salesTotalLifetime > 0 ? pulse.salesTotalLifetime : salesFromTenants,
    openTickets: tickets.filter((t) => t.status !== "resolved").length,
    source,
    serviceRole,
    quietShopCount: pulse.quietShopCount,
    lowStockOrgs: pulse.lowStockOrgs,
    waAttachedCount: pulse.waAttachedCount,
    storefrontLiveCount: pulse.storefrontLiveCount,
  };
}

export async function updateHqTenant(
  id: string,
  input: {
    brand?: Partial<HqTenantBrand>;
    license?: { plan?: PlanTier; expiry?: string; extras?: string[] };
    status?: "active" | "suspended";
  },
): Promise<HqTenant | null> {
  const existing = await getHqTenant(id);
  if (!existing) return null;

  if (existing.source === "local_tenant" || id === LOCAL_TENANT_ID) {
    const current = await readTenant();
    await writeTenant({
      brand: {
        businessName: input.brand?.businessName,
        logoUrl: input.brand?.logoUrl,
        accentColor: input.brand?.accentColor,
      },
      license: {
        plan: input.license?.plan,
        expiry: input.license?.expiry,
        extras: input.license?.extras,
        suspended:
          input.status === "suspended"
            ? true
            : input.status === "active"
              ? false
              : current.license.suspended,
      },
    });
    return getHqTenant(LOCAL_TENANT_ID);
  }

  if (existing.source === "clients") {
    const patch: Record<string, unknown> = {};
    if (input.brand?.businessName != null) patch.name = input.brand.businessName;
    if (input.license?.plan) patch.plan = input.license.plan;
    if (input.license?.expiry != null) patch.expiry = input.license.expiry;
    if (input.license?.extras) patch.extras = input.license.extras;
    if (input.status) patch.status = input.status;
    await updateEntity("clients", id, patch);
    return getHqTenant(id);
  }

  // reseller_licences org — write tenant document via service role
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data: doc } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", id)
      .eq("key", "tenant")
      .maybeSingle();

    const current = (doc?.data ?? DEFAULT_TENANT) as TenantConfig;
    const suspended =
      input.status === "suspended"
        ? true
        : input.status === "active"
          ? false
          : Boolean(current.license?.suspended);
    const next: TenantConfig = {
      brand: {
        businessName:
          input.brand?.businessName ??
          current.brand?.businessName ??
          existing.name,
        logoUrl: input.brand?.logoUrl ?? current.brand?.logoUrl ?? "",
        accentColor:
          input.brand?.accentColor ?? current.brand?.accentColor ?? "",
      },
      license: {
        plan: (input.license?.plan ??
          (current.license?.plan as PlanTier) ??
          "starter") as PlanTier,
        expiry: input.license?.expiry ?? current.license?.expiry ?? "",
        extras: Array.isArray(input.license?.extras)
          ? input.license.extras
          : Array.isArray(current.license?.extras)
            ? current.license.extras
            : [],
        suspended,
      },
    };

    const { error } = await db.from("app_documents").upsert(
      {
        org_id: id,
        key: "tenant",
        data: next as unknown as import("@/lib/supabase/database.types").Json,
      },
      { onConflict: "org_id,key" },
    );
    if (error) throw new Error(error.message);

    if (input.brand?.businessName) {
      await db
        .from("organizations")
        .update({ name: input.brand.businessName })
        .eq("id", id);
    }

    return getHqTenant(id);
  } catch {
    return null;
  }
}

/** Soft-remove a demo pipeline client only — never deletes organizations. */
export async function deleteHqTenant(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getHqTenant(id);
  if (!existing) return { ok: false, error: "Tenant not found" };
  if (existing.source !== "clients") {
    return {
      ok: false,
      error: "Remove from pipeline is only for demo clients — organizations are never deleted",
    };
  }
  const removed = await deleteEntity("clients", id);
  if (!removed) return { ok: false, error: "Could not remove client" };
  return { ok: true };
}

export type OnboardInput = {
  name: string;
  contact: string;
  plan: PlanTier;
  expiry: string;
  accentColor?: string;
  logoUrl?: string;
  /** Apply branding + licence to this workspace (dedicated deploy). */
  applyBranding?: boolean;
  /** When service-role is available, create a real organization + storefront. */
  provisionOrg?: boolean;
};

async function allocateOrgSlug(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  base: string,
): Promise<string> {
  const root = base || `org-${randomUUID().slice(0, 8)}`;
  for (let i = 0; i < 30; i += 1) {
    const candidate = i === 0 ? root : `${root.slice(0, 40)}-${i}`;
    if (isReservedStorefrontSlug(candidate)) continue;
    const { data } = await db
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
  return `${root.slice(0, 36)}-${randomUUID().slice(0, 6)}`;
}

/**
 * Full durable tenant shell: org + MAIN branch + register + tenant licence +
 * published storefront. Owner Auth user is still provisioned via
 * scripts/provision-tenant-owner.mjs (password never travels through HQ UI).
 *
 * Idempotent: re-running with the same business name reuses the org and
 * fills any missing branch / register / tenant doc / storefront.
 */
async function provisionDurableTenant(input: {
  name: string;
  plan: PlanTier;
  expiry: string;
  accentColor?: string;
  logoUrl?: string;
}): Promise<{ orgId: string; slug: string; recovered: boolean }> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required to provision organizations");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceSupabase() as any;
  const name = input.name.trim();
  const baseSlug = slugifyOrgName(name);

  let orgId: string | null = null;
  let slug = baseSlug;
  let recovered = false;

  // Match existing by preferred slug first, then by exact name (case-insensitive).
  {
    const { data: bySlug } = await db
      .from("organizations")
      .select("id, slug")
      .eq("slug", baseSlug)
      .maybeSingle();
    if (bySlug?.id) {
      orgId = bySlug.id as string;
      slug = bySlug.slug as string;
      recovered = true;
    } else {
      const { data: byName } = await db
        .from("organizations")
        .select("id, slug")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (byName?.id) {
        orgId = byName.id as string;
        slug = (byName.slug as string) || baseSlug;
        recovered = true;
      }
    }
  }

  if (!orgId) {
    slug = await allocateOrgSlug(db, baseSlug);
    const { data: org, error: orgErr } = await db
      .from("organizations")
      .insert({ name, slug })
      .select("id, slug")
      .single();
    if (orgErr) {
      // Race / unique slug: another request won — reuse that org.
      const { data: raced } = await db
        .from("organizations")
        .select("id, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (raced?.id) {
        orgId = raced.id as string;
        slug = raced.slug as string;
        recovered = true;
      } else {
        throw new Error(orgErr.message);
      }
    } else {
      orgId = org.id as string;
      slug = org.slug as string;
    }
  }

  let branchId: string | null = null;
  {
    const { data: existingBranch } = await db
      .from("branches")
      .select("id")
      .eq("org_id", orgId)
      .eq("code", "MAIN")
      .maybeSingle();
    if (existingBranch?.id) {
      branchId = existingBranch.id as string;
    } else {
      const { data: branch, error: branchErr } = await db
        .from("branches")
        .insert({ org_id: orgId, name: "Main Branch", code: "MAIN" })
        .select("id")
        .single();
      if (branchErr) throw new Error(branchErr.message);
      branchId = branch.id as string;
    }
  }

  {
    const { data: regs } = await db
      .from("registers")
      .select("id")
      .eq("branch_id", branchId)
      .limit(1);
    if (!regs?.length) {
      const { error: regErr } = await db.from("registers").insert({
        branch_id: branchId,
        name: "Register 1",
      });
      if (regErr) throw new Error(regErr.message);
    }
  }

  const { error: tenantErr } = await db.from("app_documents").upsert(
    {
      org_id: orgId,
      key: "tenant",
      data: {
        brand: {
          businessName: name,
          logoUrl: (input.logoUrl ?? "").trim(),
          accentColor: (input.accentColor ?? "").trim(),
        },
        license: {
          plan: input.plan,
          expiry: input.expiry,
          extras: [],
          suspended: false,
        },
      },
    },
    { onConflict: "org_id,key" },
  );
  if (tenantErr) throw new Error(tenantErr.message);

  // storefronts PK is org_id (one row per org); slug is globally unique.
  {
    const { data: sf } = await db
      .from("storefronts")
      .select("org_id, slug")
      .eq("org_id", orgId)
      .maybeSingle();
    if (!sf?.org_id) {
      const { error: sfErr } = await db.from("storefronts").insert({
        org_id: orgId,
        slug,
        enabled: true,
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (sfErr) {
        // Unique race on slug — re-check by org.
        const { data: again } = await db
          .from("storefronts")
          .select("org_id")
          .eq("org_id", orgId)
          .maybeSingle();
        if (!again?.org_id) throw new Error(sfErr.message);
      }
    } else if (sf.slug !== slug) {
      // Keep existing published slug as canonical for this org.
      slug = sf.slug as string;
    } else {
      const { error: pubErr } = await db
        .from("storefronts")
        .update({
          enabled: true,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .eq("org_id", orgId);
      if (pubErr) throw new Error(pubErr.message);
    }
  }

  // Public storefront needs website + commerce + settings docs. Without these,
  // anonymous /store/{slug} falls through to session doc stores and 500s.
  const storeCfg = {
    name,
    slug,
    status: "published",
    themeId: "local",
    currency: "LKR",
    locale: "en",
    timezone: "Asia/Colombo",
    delivery: {
      pickup: true,
      localDelivery: true,
      islandwide: true,
      freeThreshold: 10000,
      zones: [{ id: "colombo", name: "Colombo", fee: 100 }],
    },
    cod: {
      enabled: true,
      minOrder: 0,
      maxOrder: 100000,
      fee: 0,
      requireConfirmation: false,
    },
  };
  const nowIso = new Date().toISOString();
  const cmsDocs: { key: string; data: Record<string, unknown> }[] = [
    {
      key: "website",
      data: {
        enabled: true,
        heroHeadline: `${name} Store`,
        heroSubline: "Powered by MyPoz",
        paymentModes: ["cash", "card", "bank_transfer"],
        fulfilmentModes: ["pickup", "courier"],
        theme: "classic",
      },
    },
    {
      key: "commerce",
      data: {
        draft: storeCfg,
        published: storeCfg,
        publishedAt: nowIso,
        updatedAt: nowIso,
      },
    },
    {
      key: "settings",
      data: {
        businessName: name,
        storeEnabled: "Yes",
        storeSlug: slug,
        currency: "LKR",
      },
    },
  ];
  for (const doc of cmsDocs) {
    const { error: cmsErr } = await db.from("app_documents").upsert(
      { org_id: orgId, key: doc.key, data: doc.data },
      { onConflict: "org_id,key" },
    );
    if (cmsErr) throw new Error(cmsErr.message);
  }

  try {
    const { writeAuditEvent } = await import("@/lib/server/audit-service");
    await writeAuditEvent({
      orgId,
      useServiceRole: true,
      action: recovered ? "hq.provision.recovered" : "hq.provision.created",
      entity: "organization",
      entityId: orgId,
      details: `slug=${slug}`,
      actorLabel: "hq-provision",
    });
  } catch {
    // Audit is best-effort — never block provision.
  }

  return { orgId, slug, recovered };
}

export async function onboardHqTenant(input: OnboardInput): Promise<{
  client: Awaited<ReturnType<typeof createEntity>>;
  orgId: string | null;
  slug: string | null;
  appliedLocal: boolean;
  provisionError: string | null;
}> {
  const client = await createEntity("clients", {
    name: input.name.trim(),
    contact: input.contact.trim(),
    plan: input.plan,
    expiry: input.expiry,
    status: "active",
  });

  let appliedLocal = false;
  if (input.applyBranding) {
    await writeTenant({
      brand: {
        businessName: input.name.trim(),
        logoUrl: (input.logoUrl ?? "").trim(),
        accentColor: (input.accentColor ?? "").trim(),
      },
      license: { plan: input.plan, expiry: input.expiry, extras: [] },
    });
    appliedLocal = true;
  }

  let orgId: string | null = null;
  let slug: string | null = null;
  let provisionError: string | null = null;

  if (input.provisionOrg) {
    try {
      const provisioned = await provisionDurableTenant({
        name: input.name,
        plan: input.plan,
        expiry: input.expiry,
        accentColor: input.accentColor,
        logoUrl: input.logoUrl,
      });
      orgId = provisioned.orgId;
      slug = provisioned.slug;
    } catch (err) {
      provisionError =
        err instanceof Error ? err.message : "Organization provision failed";
    }
  }

  return { client, orgId, slug, appliedLocal, provisionError };
}

export async function listHqTickets(): Promise<HqTicket[]> {
  const remote = await ticketsFromTable();
  const items =
    remote ?? (await readJsonFile<HqTicket[]>(TICKETS_FILE, []));
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createHqTicket(input: {
  subject: string;
  body: string;
  tenantId: string;
  tenantName: string;
  priority?: HqTicket["priority"];
  contact?: string;
}): Promise<HqTicket> {
  const now = new Date().toISOString();
  const ticket: HqTicket = {
    id: `TKT-${randomUUID().slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
    subject: input.subject.slice(0, 200),
    body: input.body.slice(0, 4000),
    tenantId: input.tenantId.slice(0, 80),
    tenantName: input.tenantName.slice(0, 160),
    status: "open",
    priority: input.priority ?? "normal",
    contact: (input.contact ?? "").slice(0, 120),
  };
  const items = await listHqTickets();
  items.unshift(ticket);
  await persistTickets(items);
  return ticket;
}

export async function updateHqTicket(
  id: string,
  patch: Partial<Pick<HqTicket, "status" | "priority" | "body">>,
): Promise<HqTicket | null> {
  const items = await listHqTickets();
  const idx = items.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  const next = {
    ...items[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[idx] = next;
  await persistTickets(items);
  return next;
}

export async function deleteHqTicket(id: string): Promise<boolean> {
  const items = await listHqTickets();
  const next = items.filter((t) => t.id !== id);
  if (next.length === items.length) return false;
  await persistTickets(next);
  return true;
}

export function hqDocBySlug(slug: string) {
  return HQ_DOC_PAGES.find((d) => d.slug === slug) ?? null;
}
