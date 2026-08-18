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
  listCollection,
  updateEntity,
} from "@/lib/server/collection-store";
import { readTenant, writeTenant } from "@/lib/server/tenant-store";
import { dataFile, readJsonFile, writeJsonFile } from "@/lib/server/persistence/local-json";

const TICKETS_FILE = dataFile("hq-tickets.json");
const LOCAL_TENANT_ID = "local";

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

async function tryResellerLicences(): Promise<HqTenant[] | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db.from("reseller_licences").select("*");
    if (error) return null;
    const rows = (data ?? []) as unknown as ResellerLicenceRow[];
    return rows.map(fromResellerRow);
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
    status: licenceStatus(tenant.license.expiry || null),
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
  if (fromView) {
    return {
      tenants: fromView.sort((a, b) => a.name.localeCompare(b.name)),
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
    const extras = (data?.data as { license?: { extras?: unknown } } | null)
      ?.license?.extras;
    if (Array.isArray(extras)) {
      return { ...found, extras: extras.map(String).filter((k) => /^[a-z0-9-]{2,40}$/.test(k)) };
    }
  } catch {
    // keep listed extras
  }
  return found;
}

export async function getHqSummary(): Promise<HqSummary> {
  const { tenants, source, serviceRole } = await listHqTenants();
  const tickets = await listHqTickets();
  return {
    tenantCount: tenants.length,
    expiredCount: tenants.filter((t) => t.status === "expired").length,
    expiringCount: tenants.filter((t) => t.status === "expiring").length,
    salesTotal: tenants.reduce((s, t) => s + t.salesTotal, 0),
    openTickets: tickets.filter((t) => t.status !== "resolved").length,
    source,
    serviceRole,
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

export type OnboardInput = {
  name: string;
  contact: string;
  plan: PlanTier;
  expiry: string;
  accentColor?: string;
  logoUrl?: string;
  /** Apply branding + licence to this workspace (dedicated deploy). */
  applyBranding?: boolean;
  /** When service-role is available, create a real organization row. */
  provisionOrg?: boolean;
};

export async function onboardHqTenant(input: OnboardInput): Promise<{
  client: Awaited<ReturnType<typeof createEntity>>;
  orgId: string | null;
  appliedLocal: boolean;
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
  if (
    input.provisionOrg &&
    isSupabaseEnabled &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    try {
      const db = createServiceSupabase();
      const slug = input.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      const { data: org, error } = await db
        .from("organizations")
        .insert({
          name: input.name.trim(),
          slug: slug || `org-${randomUUID().slice(0, 8)}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      orgId = org.id;

      await db.from("branches").insert({
        org_id: orgId,
        name: "Main Branch",
        code: "MAIN",
      });

      await db.from("app_documents").upsert(
        {
          org_id: orgId,
          key: "tenant",
          data: {
            brand: {
              businessName: input.name.trim(),
              logoUrl: (input.logoUrl ?? "").trim(),
              accentColor: (input.accentColor ?? "").trim(),
            },
            license: {
              plan: input.plan,
              expiry: input.expiry,
              extras: [],
            },
          } as unknown as import("@/lib/supabase/database.types").Json,
        },
        { onConflict: "org_id,key" },
      );
    } catch {
      orgId = null;
    }
  }

  return { client, orgId, appliedLocal };
}

export async function listHqTickets(): Promise<HqTicket[]> {
  const items = await readJsonFile<HqTicket[]>(TICKETS_FILE, []);
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
  await writeJsonFile(TICKETS_FILE, items);
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
  await writeJsonFile(TICKETS_FILE, items);
  return next;
}

export function hqDocBySlug(slug: string) {
  return HQ_DOC_PAGES.find((d) => d.slug === slug) ?? null;
}
