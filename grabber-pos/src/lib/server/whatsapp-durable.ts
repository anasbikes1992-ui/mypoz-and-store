import "server-only";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  isValidMetaPhoneNumberId,
  normalizeMetaPhoneNumberId,
  readStoredMetaPhoneNumberId,
} from "@/lib/whatsapp/phone-number-id";
import type { BotCatalogCategory } from "@/lib/whatsapp/menu";
import type { Sale } from "@/lib/types";

type ServiceDb = ReturnType<typeof createServiceSupabase>;

export interface WhatsAppTenant {
  db: ServiceDb;
  orgId: string;
  branchId: string;
}

function asJson(value: unknown): Json {
  return value as Json;
}

function useServiceLedger(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function tenantForOrg(db: ServiceDb, orgId: string): Promise<WhatsAppTenant | null> {
  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!branch) return null;
  return { db, orgId, branchId: branch.id };
}

/** Merchant settings / inbox — always scoped to the signed-in org. */
export async function resolveWhatsAppTenantForOrg(
  orgId: string,
): Promise<WhatsAppTenant | null> {
  if (!useServiceLedger()) return null;
  const db = createServiceSupabase();
  return tenantForOrg(db, orgId);
}

/** Service-role tenant for Meta webhooks (no user JWT) and shared inbox rows. */
export async function resolveWhatsAppTenant(
  phoneNumberId?: string | null,
): Promise<WhatsAppTenant | null> {
  if (!useServiceLedger()) return null;
  const db = createServiceSupabase();
  const orgId = await resolveOrgId(db, phoneNumberId);
  if (!orgId) return null;
  return tenantForOrg(db, orgId);
}

async function resolveOrgId(
  db: ServiceDb,
  phoneNumberId?: string | null,
): Promise<string | null> {
  const phone = phoneNumberId?.trim();
  if (phone) {
    try {
      const { data } = await db.rpc("whatsapp_resolve_org", {
        p_phone_number_id: phone,
      });
      if (typeof data === "string" && data) return data;
    } catch {
      // RPC not applied yet — match saved WhatsApp settings document.
    }
    const { data: docs } = await db
      .from("app_documents")
      .select("org_id, data")
      .eq("key", "whatsapp");
    const hit = (docs ?? []).find((row) => {
      const data = row.data as { phoneNumberId?: string } | null;
      return data?.phoneNumberId?.trim() === phone;
    });
    if (hit?.org_id) return hit.org_id as string;
    // A phone id was supplied but does not map to any org — never guess from session.
    return null;
  }

  try {
    const session = await createServerSupabase();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (user) {
      const { data: profile } = await session
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle<{ org_id: string }>();
      if (profile?.org_id) return profile.org_id;
    }
  } catch {
    // Webhook has no cookies; ignore.
  }

  const { data: orgs } = await db
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(2);
  if (orgs?.length === 1) return orgs[0]!.id;
  return null;
}

export async function listWhatsAppCatalog(
  tenant: WhatsAppTenant,
): Promise<BotCatalogCategory[]> {
  const [{ data, error }, catsRes, stockRes] = await Promise.all([
    tenant.db
      .from("products")
      .select("id, name, sale_price, category_id")
      .eq("org_id", tenant.orgId)
      .eq("is_active", true)
      .order("name")
      .limit(800),
    tenant.db
      .from("categories")
      .select("id, name")
      .eq("org_id", tenant.orgId),
    tenant.db
      .from("branch_stock")
      .select("product_id, quantity")
      .eq("branch_id", tenant.branchId),
  ]);
  if (error) throw new Error(error.message);

  const qty = new Map<string, number>();
  for (const row of stockRes.data ?? []) {
    qty.set(
      row.product_id,
      (qty.get(row.product_id) ?? 0) + Number(row.quantity || 0),
    );
  }
  const catNames = new Map(
    (catsRes.data ?? []).map((c) => [c.id, c.name] as const),
  );
  const byCat = new Map<string, BotCatalogCategory>();
  for (const row of data ?? []) {
    const name = catNames.get(row.category_id ?? "")?.trim() || "General";
    const bucket = byCat.get(name) ?? { name, products: [] };
    bucket.products.push({
      id: row.id,
      name: row.name,
      salePrice: Number(row.sale_price) || 0,
      stock: qty.get(row.id) ?? 0,
    });
    byCat.set(name, bucket);
  }
  return [...byCat.values()];
}

export async function createWhatsAppSale(opts: {
  tenant: WhatsAppTenant;
  phoneNumberId?: string | null;
  customerName: string;
  customerMobile: string;
  lines: { productId: string; quantity: number }[];
}): Promise<Sale> {
  const payload = {
    customerName: opts.customerName,
    customerMobile: opts.customerMobile,
    lines: opts.lines.map((l) => ({
      productId: l.productId,
      product_id: l.productId,
      quantity: l.quantity,
    })),
  };

  const { data, error } = await opts.tenant.db.rpc("whatsapp_create_order", {
    p_phone_number_id: opts.phoneNumberId ?? "",
    p_payload: asJson(payload),
  });

  if (error || !data) {
    throw new Error(
      error?.message ||
        "whatsapp_create_order failed. Apply migration 0014_whatsapp_orders.sql.",
    );
  }
  return mapPostedSale(data);
}

function mapPostedSale(raw: unknown): Sale {
  const row = (raw ?? {}) as Record<string, unknown>;
  const rawLines = (row.lines ?? row.sale_lines ?? []) as Record<string, unknown>[];
  const total = Number(row.total ?? 0);
  return {
    id: String(row.receipt_no ?? row.id ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    subtotal: Number(row.subtotal ?? total),
    discountTotal: Number(row.discount_total ?? 0),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
    total,
    paymentMethod: "cash",
    isWholesale: false,
    customerName: (row.customer_name as string) ?? null,
    customerMobile: (row.customer_mobile as string) ?? null,
    employee: (row.employee as string) ?? "whatsapp-bot",
    cashReceived: row.cash_received != null ? Number(row.cash_received) : total,
    change: row.change_due != null ? Number(row.change_due) : 0,
    status: "completed",
    voidReason: null,
    voidedAt: null,
    source: "WHATSAPP",
    fulfillmentStatus: "pending",
    paymentStatus: "unpaid",
    lines: rawLines.map((l) => ({
      productId: String(l.product_id ?? ""),
      name: String(l.name ?? ""),
      unitPrice: Number(l.unit_price ?? 0),
      quantity: Number(l.quantity ?? 0),
      discount: Number(l.discount ?? 0),
      lineTotal: Number(l.line_total ?? 0),
    })),
  };
}

export async function findWhatsAppSale(
  tenant: WhatsAppTenant,
  query: string,
): Promise<Sale | null> {
  const q = query.trim();
  if (!q || !/^[A-Za-z0-9:_-]+$/.test(q)) return null;
  const { data } = await tenant.db
    .from("sales")
    .select(
      "id, receipt_no, created_at, subtotal, discount_total, total, payment_method, cash_received, change_due, status, customer_name, customer_mobile, employee",
    )
    .eq("org_id", tenant.orgId)
    .or(`receipt_no.eq.${q},id.eq.${q}`)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.receipt_no ?? data.id),
    createdAt: String(data.created_at),
    subtotal: Number(data.subtotal),
    discountTotal: Number(data.discount_total ?? 0),
    finalDiscount: 0,
    serviceCharge: 0,
    total: Number(data.total),
    paymentMethod: "cash",
    isWholesale: false,
    customerName: data.customer_name ?? null,
    customerMobile: data.customer_mobile ?? null,
    employee: data.employee ?? null,
    cashReceived: data.cash_received != null ? Number(data.cash_received) : null,
    change: data.change_due != null ? Number(data.change_due) : null,
    status: (data.status as Sale["status"]) ?? "completed",
    voidReason: null,
    voidedAt: null,
    source: "WHATSAPP",
    fulfillmentStatus: "pending",
    paymentStatus: "unpaid",
    lines: [],
  };
}

export async function listCollection<T extends { id: string }>(
  tenant: WhatsAppTenant,
  collection: string,
): Promise<T[]> {
  const { data, error } = await tenant.db
    .from("app_collections")
    .select("data")
    .eq("org_id", tenant.orgId)
    .eq("collection", collection);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.data as unknown as T);
}

export async function getCollection<T extends { id: string }>(
  tenant: WhatsAppTenant,
  collection: string,
  id: string,
): Promise<T | null> {
  const { data, error } = await tenant.db
    .from("app_collections")
    .select("data")
    .eq("org_id", tenant.orgId)
    .eq("collection", collection)
    .eq("entity_id", id)
    .maybeSingle<{ data: unknown }>();
  if (error) throw new Error(error.message);
  return (data?.data as T | undefined) ?? null;
}

export async function putCollection<T extends { id: string }>(
  tenant: WhatsAppTenant,
  collection: string,
  item: T,
): Promise<T> {
  const { error } = await tenant.db.from("app_collections").upsert(
    {
      org_id: tenant.orgId,
      collection,
      entity_id: item.id,
      data: asJson(item),
    },
    { onConflict: "org_id,collection,entity_id" },
  );
  if (error) throw new Error(error.message);
  return item;
}

export async function findCollectionByField<T extends { id: string }>(
  tenant: WhatsAppTenant,
  collection: string,
  jsonField: string,
  value: string,
): Promise<T | null> {
  const { data, error } = await tenant.db
    .from("app_collections")
    .select("data")
    .eq("org_id", tenant.orgId)
    .eq("collection", collection)
    .filter(`data->>${jsonField}`, "eq", value)
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0]?.data;
  return (row as T | undefined) ?? null;
}

export async function readWhatsAppDocument(
  tenant: WhatsAppTenant,
): Promise<Record<string, unknown>> {
  const { data, error } = await tenant.db
    .from("app_documents")
    .select("data")
    .eq("org_id", tenant.orgId)
    .eq("key", "whatsapp")
    .maybeSingle<{ data: Record<string, unknown> }>();
  if (error) throw new Error(error.message);
  return data?.data ?? {};
}

export async function writeWhatsAppDocument(
  tenant: WhatsAppTenant,
  value: Record<string, unknown>,
): Promise<void> {
  const { error } = await tenant.db.from("app_documents").upsert(
    {
      org_id: tenant.orgId,
      key: "whatsapp",
      data: asJson(value),
    },
    { onConflict: "org_id,key" },
  );
  if (error) throw new Error(error.message);
}

export interface WhatsAppFleetRow {
  orgId: string;
  name: string;
  slug: string;
  phoneNumberId: string;
  phoneNumberIdSet: boolean;
  tokenSet: boolean;
  locale: string;
}

export async function listWhatsAppFleet(): Promise<WhatsAppFleetRow[]> {
  if (!useServiceLedger()) return [];
  const db = createServiceSupabase();
  const [{ data: orgs }, { data: docs }] = await Promise.all([
    db.from("organizations").select("id, name, slug").order("name"),
    db.from("app_documents").select("org_id, data").eq("key", "whatsapp"),
  ]);
  const byOrg = new Map(
    (docs ?? []).map((d) => [d.org_id as string, d.data as Record<string, unknown>]),
  );
  return (orgs ?? []).map((org) => {
    const data = byOrg.get(org.id) ?? {};
    const phoneNumberId = readStoredMetaPhoneNumberId(data.phoneNumberId);
    return {
      orgId: org.id,
      name: org.name,
      slug: org.slug,
      phoneNumberId,
      phoneNumberIdSet: isValidMetaPhoneNumberId(phoneNumberId),
      tokenSet: Boolean(String(data.accessToken ?? "").trim()),
      locale: String(data.locale ?? "en"),
    };
  });
}

export async function attachWhatsAppToOrg(
  orgId: string,
  patch: { phoneNumberId?: string; accessToken?: string; locale?: string },
): Promise<void> {
  const db = createServiceSupabase();
  const { data: existing } = await db
    .from("app_documents")
    .select("data")
    .eq("org_id", orgId)
    .eq("key", "whatsapp")
    .maybeSingle<{ data: Record<string, unknown> }>();
  const cur = existing?.data ?? {};
  let phoneNumberId = readStoredMetaPhoneNumberId(cur.phoneNumberId);
  if (patch.phoneNumberId !== undefined) {
    const trimmed = patch.phoneNumberId.trim();
    phoneNumberId = trimmed ? normalizeMetaPhoneNumberId(trimmed) : phoneNumberId;
  }
  const next = {
    ...cur,
    phoneNumberId,
    accessToken: patch.accessToken?.trim()
      ? patch.accessToken.trim()
      : (cur.accessToken ?? ""),
    locale: patch.locale ?? cur.locale ?? "en",
    updatedAt: new Date().toISOString(),
  };
  const { error } = await db.from("app_documents").upsert(
    {
      org_id: orgId,
      key: "whatsapp",
      data: asJson(next),
    },
    { onConflict: "org_id,key" },
  );
  if (error) throw new Error(error.message);
}

/** Clear phone + token for an org; keep locale. No-op if no WhatsApp doc. */
export async function detachWhatsAppFromOrg(orgId: string): Promise<void> {
  if (!useServiceLedger()) return;
  const db = createServiceSupabase();
  const { data: existing } = await db
    .from("app_documents")
    .select("data")
    .eq("org_id", orgId)
    .eq("key", "whatsapp")
    .maybeSingle<{ data: Record<string, unknown> }>();
  if (!existing?.data) return;
  const cur = existing.data;
  const next = {
    ...cur,
    phoneNumberId: "",
    accessToken: "",
    locale: String(cur.locale ?? "en"),
    updatedAt: new Date().toISOString(),
  };
  const { error } = await db.from("app_documents").upsert(
    {
      org_id: orgId,
      key: "whatsapp",
      data: asJson(next),
    },
    { onConflict: "org_id,key" },
  );
  if (error) throw new Error(error.message);
}
