import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import type { PaymentMode, FulfilmentMode } from "@/lib/website";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";

export interface StorefrontOrderLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variantId?: string | null;
}

export interface StorefrontWebOrder {
  id: string;
  receiptNo: string;
  saleId: string | null;
  slug: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string | null;
  customerId: string | null;
  address: string;
  pickupNote: string;
  paymentMethod: PaymentMode;
  paymentReference: string;
  fulfilment: FulfilmentMode;
  lines: StorefrontOrderLine[];
  total: number;
  deliveryFee?: number;
  codFee?: number;
  finalDiscount?: number;
  source?: string;
  fulfillmentStatus?: string;
  boardId: string | null;
  boardKind: "click-collect" | "delivery" | null;
  /** True when card checkout is waiting for gateway webhook. */
  pendingPayment?: boolean;
  /** Bank-slip / transfer proof (data URL or https). */
  paymentProofUrl?: string;
  paymentProofStatus?: "none" | "submitted" | "approved" | "rejected";
  paymentProofNote?: string;
  createdAt: string;
}

const store = recordStore<StorefrontWebOrder>({
  collection: "storefront-orders",
  file: "storefront-orders.json",
});

function useServiceLedger(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function assertNoLocalFallbackForPublicOrders(): void {
  if (isSupabaseEnabled && requireSupabase && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Checkout is temporarily unavailable: server payment ledger is not configured.",
    );
  }
}

async function resolveStorefrontOrgId(opts: {
  host: string | null;
  slug: string | null;
}): Promise<string> {
  if (!useServiceLedger()) throw new Error("Service ledger unavailable");
  const db = createServiceSupabase();
  const p_host = opts.host ?? "";
  const p_slug = opts.slug ?? "";
  const { data, error } = await (db as any).rpc("storefront_by_host", {
    p_host,
    p_slug,
  });
  if (error || !data) throw new Error("Could not resolve storefront org id");
  const row = data as { org_id?: string | null } | null;
  const orgId = row?.org_id ?? null;
  if (!orgId) throw new Error("Storefront org_id not found");
  return orgId;
}

export async function saveStorefrontWebOrder(
  order: Omit<StorefrontWebOrder, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
  ctx?: { host?: string | null; slug?: string | null },
): Promise<StorefrontWebOrder> {
  assertNoLocalFallbackForPublicOrders();
  const row: StorefrontWebOrder = {
    ...order,
    id: order.id ?? `WEB-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: order.createdAt ?? new Date().toISOString(),
  };

  if (useServiceLedger()) {
    const orgId = await resolveStorefrontOrgId({
      host: ctx?.host ?? null,
      slug: ctx?.slug ?? order.slug,
    });
    const db = createServiceSupabase();
    const { error } = await db.from("app_collections").upsert(
      {
        org_id: orgId,
        collection: "storefront-orders",
        entity_id: row.id,
        data: row as unknown as Json,
      },
      { onConflict: "org_id,collection,entity_id" },
    );
    if (error) throw new Error(error.message);
    return row;
  }

  return store.put(row);
}

export async function listStorefrontWebOrders(): Promise<StorefrontWebOrder[]> {
  assertNoLocalFallbackForPublicOrders();
  const all = await store.list();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listStorefrontOrdersByCustomer(opts: {
  slug: string;
  customerEmail?: string | null;
  customerId?: string | null;
  customerMobile?: string | null;
}): Promise<StorefrontWebOrder[]> {
  const all = await store.list();
  return all
    .filter((o) => {
      if (o.slug !== opts.slug) return false;
      if (opts.customerId && o.customerId === opts.customerId) return true;
      if (
        opts.customerEmail &&
        o.customerEmail &&
        o.customerEmail.toLowerCase() === opts.customerEmail.toLowerCase()
      ) {
        return true;
      }
      if (
        opts.customerMobile &&
        o.customerMobile &&
        digits(o.customerMobile) === digits(opts.customerMobile)
      ) {
        return true;
      }
      return false;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function digits(v: string): string {
  return v.replace(/\D/g, "");
}

export async function findStorefrontOrderBySaleOrReceipt(
  saleId: string,
  receiptNo?: string,
): Promise<StorefrontWebOrder | null> {
  assertNoLocalFallbackForPublicOrders();
  const match = (o: StorefrontWebOrder) =>
    o.saleId === saleId ||
    o.receiptNo === receiptNo ||
    o.receiptNo === saleId ||
    o.id === saleId;

  // Webhooks have no user session, so this uses the service role — which
  // BYPASSES RLS and can therefore see every tenant's orders. We must:
  //   (a) query precisely, not scan a capped page that could miss the target
  //       row among many tenants' orders, and
  //   (b) prefer the globally-unique order id / saleId over the per-branch
  //       receiptNo (which can collide across organizations), and refuse an
  //       ambiguous receipt match rather than complete the wrong org's sale.
  if (useServiceLedger()) {
    const { createServiceSupabase } = await import("@/lib/supabase/server");
    const db = createServiceSupabase();
      // Only values safe to embed in a PostgREST or() filter (no '.', ',', or parens).
      const safe = (v?: string | null) =>
        v && /^[A-Za-z0-9:_-]+$/.test(v) ? v : null;
      const s = safe(saleId);
      const r = safe(receiptNo);
      const ors: string[] = [];
      if (s) {
        ors.push(`data->>id.eq.${s}`, `data->>saleId.eq.${s}`, `data->>receiptNo.eq.${s}`);
      }
      if (r && r !== s) ors.push(`data->>receiptNo.eq.${r}`);
      if (ors.length) {
        const { data, error } = await db
          .from("app_collections")
          .select("data")
          .eq("collection", "storefront-orders")
          .or(ors.join(","))
          .limit(20);
        if (!error && data && data.length) {
          const rows = data.map((row) => row.data as unknown as StorefrontWebOrder);
          const byUnique = rows.find((o) => o && (o.id === saleId || o.saleId === saleId));
          if (byUnique) return byUnique;
          const receiptMatches = rows.filter((o) => o && match(o));
          if (receiptMatches.length === 1) return receiptMatches[0]!;
          // Ambiguous receipt across tenants — refuse rather than guess.
          if (receiptMatches.length > 1) return null;
        }
      }
    // Fail-closed: when the service ledger is active, do not fall back to
    // local JSON for webhook completion.
    return null;
  }

  const all = await store.list();
  return all.find(match) ?? null;
}

export async function updateStorefrontWebOrder(
  id: string,
  patch: Partial<StorefrontWebOrder>,
): Promise<StorefrontWebOrder | null> {
  assertNoLocalFallbackForPublicOrders();
  if (useServiceLedger()) {
    const db = createServiceSupabase();
    const { data: existing, error } = await db
      .from("app_collections")
      .select("org_id,data")
      .eq("collection", "storefront-orders")
      .eq("entity_id", id)
      .maybeSingle<{ org_id?: string; data?: StorefrontWebOrder }>();
    if (error) throw new Error(error.message);
    const orgId = (existing as { org_id?: string } | null)?.org_id ?? null;
    const payload = (existing as { data?: StorefrontWebOrder } | null)?.data ?? null;
    if (!orgId || !payload) return null;
    const next: StorefrontWebOrder = { ...payload, ...patch, id };
    const { error: upErr } = await db.from("app_collections").upsert(
      {
        org_id: orgId,
        collection: "storefront-orders",
        entity_id: id,
        data: next as unknown as Json,
      },
      { onConflict: "org_id,collection,entity_id" },
    );
    if (upErr) throw new Error(upErr.message);
    return next;
  }

  const all = await store.list();
  const existing = all.find((o) => o.id === id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  return store.put(next);
}
