import "server-only";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import type { HqFleetPulse, HqTenantMonitor } from "@/lib/hq";
import { resolveAuthEmails } from "@/lib/server/hq-password";

export type { HqFleetPulse, HqTenantMonitor };

function emptyMonitor(orgId: string): HqTenantMonitor {
  return {
    orgId,
    slug: null,
    onboardedAt: null,
    period: {
      sales7d: 0,
      sales30d: 0,
      revenue7d: 0,
      revenue30d: 0,
      bySource: [],
    },
    stock: { productCount: 0, lowStock: 0, outOfStock: 0 },
    branches: [],
    users: [],
    storefront: null,
    whatsapp: { phoneNumberIdSet: false, tokenSet: false, locale: "en" },
    openOnlineOrders: 0,
    quiet: false,
  };
}

function useService(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Untyped table helper — storefronts / extended sale columns are not fully in Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawDb(): any {
  return createServiceSupabase();
}

export async function getHqTenantMonitor(
  orgId: string,
): Promise<HqTenantMonitor> {
  const empty = emptyMonitor(orgId);
  if (!useService() || !orgId || orgId === "local") return empty;

  try {
    const db = rawDb();
    const since30 = daysAgoIso(30);
    const since14 = daysAgoIso(14);
    const since7 = daysAgoIso(7);

    const [
      orgRes,
      salesRes,
      productsRes,
      branchesRes,
      profilesRes,
      storefrontRes,
      waRes,
      openRes,
    ] = await Promise.all([
      db
        .from("organizations")
        .select("id, slug, created_at")
        .eq("id", orgId)
        .maybeSingle(),
      db
        .from("sales")
        .select("created_at, total, source, status, fulfillment_status")
        .eq("org_id", orgId)
        .gte("created_at", since30)
        .limit(5000),
      db
        .from("products")
        .select("id, reorder_level")
        .eq("org_id", orgId)
        .eq("is_active", true),
      db
        .from("branches")
        .select("id, name, code, is_active, currency")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true }),
      db
        .from("profiles")
        .select("id, full_name, role, is_active")
        .eq("org_id", orgId),
      db
        .from("storefronts")
        .select("slug, domain, enabled, status, custom_domain")
        .eq("org_id", orgId)
        .maybeSingle(),
      db
        .from("app_documents")
        .select("data")
        .eq("org_id", orgId)
        .eq("key", "whatsapp")
        .maybeSingle(),
      db
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("source", "ONLINE_STORE")
        .in("fulfillment_status", ["pending", "processing"])
        .neq("status", "voided"),
    ]);

    const branchList = (branchesRes.data ?? []) as {
      id: string;
      name: string;
      code: string;
      is_active: boolean;
      currency: string;
    }[];

    let stock: { product_id: string; quantity: number }[] = [];
    if (branchList.length > 0) {
      const stockRes = await db
        .from("branch_stock")
        .select("product_id, quantity")
        .in(
          "branch_id",
          branchList.map((b) => b.id),
        )
        .limit(20000);
      if (!stockRes.error) stock = stockRes.data ?? [];
    }

    const productList = (productsRes.data ?? []) as {
      id: string;
      reorder_level: number;
    }[];
    const productReorder = new Map(
      productList.map((p) => [p.id, Number(p.reorder_level ?? 0)]),
    );
    const qtyByProduct = new Map<string, number>();
    for (const row of stock) {
      if (!productReorder.has(row.product_id)) continue;
      qtyByProduct.set(
        row.product_id,
        (qtyByProduct.get(row.product_id) ?? 0) + Number(row.quantity ?? 0),
      );
    }

    let lowStock = 0;
    let outOfStock = 0;
    for (const [pid, reorder] of productReorder) {
      const qty = qtyByProduct.get(pid) ?? 0;
      if (qty <= 0) outOfStock += 1;
      else if (qty <= reorder) lowStock += 1;
    }

    const salesOk = !salesRes.error;
    const sales = (
      (salesRes.data ?? []) as {
        created_at: string;
        total: number;
        source: string | null;
        status: string | null;
        fulfillment_status: string | null;
      }[]
    ).filter((s) => s.status !== "voided");

    let sales7d = 0;
    let sales30d = 0;
    let revenue7d = 0;
    let revenue30d = 0;
    const sourceMap = new Map<string, { count: number; total: number }>();
    let soldIn14d = false;
    const t7 = Date.parse(since7);
    const t14 = Date.parse(since14);

    for (const s of sales) {
      const t = new Date(s.created_at).getTime();
      const total = Number(s.total ?? 0);
      const src = String(s.source ?? "POS");
      sales30d += 1;
      revenue30d += total;
      if (t >= t7) {
        sales7d += 1;
        revenue7d += total;
      }
      if (t >= t14) soldIn14d = true;
      const bucket = sourceMap.get(src) ?? { count: 0, total: 0 };
      bucket.count += 1;
      bucket.total += total;
      sourceMap.set(src, bucket);
    }

    // Confirm recent activity outside the 30d sales fetch window if needed (14 < 30).
    if (!soldIn14d && salesOk && productList.length > 0) {
      const recent = await db
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gte("created_at", since14)
        .neq("status", "voided");
      if (!recent.error && (recent.count ?? 0) > 0) soldIn14d = true;
    }

    const waData =
      (waRes.data as { data?: Record<string, unknown> } | null)?.data ?? {};
    const sf = storefrontRes.data as {
      slug: string | null;
      domain: string | null;
      enabled: boolean;
      status: string | null;
      custom_domain?: string | null;
    } | null;

    const productCount = productList.length;
    const openOnlineOrders =
      !openRes.error && typeof openRes.count === "number"
        ? openRes.count
        : 0;

    return {
      orgId,
      slug: (orgRes.data as { slug?: string } | null)?.slug ?? null,
      onboardedAt:
        (orgRes.data as { created_at?: string } | null)?.created_at ?? null,
      period: {
        sales7d,
        sales30d,
        revenue7d,
        revenue30d,
        bySource: [...sourceMap.entries()].map(([source, v]) => ({
          source,
          count: v.count,
          total: v.total,
        })),
      },
      stock: { productCount, lowStock, outOfStock },
      branches: branchList.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        isActive: Boolean(b.is_active),
        currency: b.currency || "LKR",
      })),
      users: await (async () => {
        const profiles = (
          (profilesRes.data ?? []) as {
            id: string;
            full_name: string;
            role: string;
            is_active: boolean;
          }[]
        ).map((u) => ({
          id: u.id,
          fullName: u.full_name || "",
          role: u.role || "",
          isActive: Boolean(u.is_active),
          email: null as string | null,
        }));
        const emails = await resolveAuthEmails(profiles.map((p) => p.id));
        return profiles.map((p) => ({
          ...p,
          email: emails.get(p.id) ?? null,
        }));
      })(),
      storefront: sf
        ? {
            slug: sf.slug,
            domain: sf.custom_domain || sf.domain || null,
            enabled: Boolean(sf.enabled),
            status: sf.status ?? null,
          }
        : null,
      whatsapp: {
        phoneNumberIdSet: Boolean(String(waData.phoneNumberId ?? "").trim()),
        tokenSet: Boolean(String(waData.accessToken ?? "").trim()),
        locale: String(waData.locale ?? "en"),
      },
      openOnlineOrders,
      quiet: salesOk && productCount > 0 && !soldIn14d,
    };
  } catch {
    return empty;
  }
}

export async function getHqFleetPulse(): Promise<HqFleetPulse> {
  const zero: HqFleetPulse = {
    salesTotalLifetime: 0,
    quietShopCount: 0,
    lowStockOrgs: 0,
    waAttachedCount: 0,
    storefrontLiveCount: 0,
  };
  if (!useService()) return zero;

  try {
    const db = rawDb();
    const { data: orgs } = await db
      .from("organizations")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(50);
    const orgIds = ((orgs ?? []) as { id: string }[]).map((o) => o.id);
    if (orgIds.length === 0) return zero;

    const since14 = daysAgoIso(14);

    const [
      licenceRes,
      waRes,
      sfRes,
      productsRes,
      recentSalesRes,
      branchesRes,
    ] = await Promise.all([
      db.from("reseller_licences").select("org_id, sales_total").limit(50),
      db
        .from("app_documents")
        .select("org_id, data")
        .eq("key", "whatsapp")
        .in("org_id", orgIds),
      db
        .from("storefronts")
        .select("org_id, enabled, status")
        .in("org_id", orgIds),
      db
        .from("products")
        .select("org_id, id, reorder_level")
        .in("org_id", orgIds)
        .eq("is_active", true)
        .limit(5000),
      db
        .from("sales")
        .select("org_id")
        .in("org_id", orgIds)
        .gte("created_at", since14)
        .neq("status", "voided")
        .limit(5000),
      db.from("branches").select("id, org_id").in("org_id", orgIds),
    ]);

    let salesTotalLifetime = 0;
    for (const row of (licenceRes.data ?? []) as {
      sales_total: number | null;
    }[]) {
      salesTotalLifetime += Number(row.sales_total ?? 0);
    }

    const orgsWithProducts = new Set<string>();
    const productMeta = new Map<string, { orgId: string; reorder: number }>();
    for (const p of (productsRes.data ?? []) as {
      org_id: string;
      id: string;
      reorder_level: number;
    }[]) {
      orgsWithProducts.add(p.org_id);
      productMeta.set(p.id, {
        orgId: p.org_id,
        reorder: Number(p.reorder_level ?? 0),
      });
    }

    const orgsWithRecentSales = new Set(
      ((recentSalesRes.data ?? []) as { org_id: string }[]).map((s) => s.org_id),
    );
    let quietShopCount = 0;
    for (const oid of orgsWithProducts) {
      if (!orgsWithRecentSales.has(oid)) quietShopCount += 1;
    }

    let waAttachedCount = 0;
    for (const doc of (waRes.data ?? []) as {
      data: Record<string, unknown>;
    }[]) {
      if (String(doc.data?.phoneNumberId ?? "").trim()) waAttachedCount += 1;
    }

    const storefrontLiveCount = (
      (sfRes.data ?? []) as {
        enabled: boolean;
        status: string | null;
      }[]
    ).filter(
      (sf) =>
        sf.enabled &&
        (sf.status === "published" || sf.status == null || sf.status === ""),
    ).length;

    const branchToOrg = new Map(
      ((branchesRes.data ?? []) as { id: string; org_id: string }[]).map(
        (b) => [b.id, b.org_id],
      ),
    );
    const branchIds = [...branchToOrg.keys()];
    let lowStockOrgs = 0;
    if (branchIds.length > 0 && productMeta.size > 0) {
      const stockRes = await db
        .from("branch_stock")
        .select("product_id, quantity, branch_id")
        .in("branch_id", branchIds)
        .limit(8000);
      const qtyByOrgProduct = new Map<string, number>();
      for (const row of (stockRes.data ?? []) as {
        product_id: string;
        quantity: number;
        branch_id: string;
      }[]) {
        const oid = branchToOrg.get(row.branch_id);
        if (!oid) continue;
        const key = `${oid}:${row.product_id}`;
        qtyByOrgProduct.set(
          key,
          (qtyByOrgProduct.get(key) ?? 0) + Number(row.quantity ?? 0),
        );
      }
      const flagged = new Set<string>();
      for (const [pid, meta] of productMeta) {
        if (flagged.has(meta.orgId)) continue;
        const qty = qtyByOrgProduct.get(`${meta.orgId}:${pid}`) ?? 0;
        if (qty <= 0 || qty <= meta.reorder) flagged.add(meta.orgId);
      }
      lowStockOrgs = flagged.size;
    }

    return {
      salesTotalLifetime,
      quietShopCount,
      lowStockOrgs,
      waAttachedCount,
      storefrontLiveCount,
    };
  } catch {
    return zero;
  }
}
