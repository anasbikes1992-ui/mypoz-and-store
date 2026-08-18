import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import type { PaymentMode, FulfilmentMode } from "@/lib/website";
import { isSupabaseEnabled } from "@/lib/supabase/config";

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
  source?: string;
  fulfillmentStatus?: string;
  boardId: string | null;
  boardKind: "click-collect" | "delivery" | null;
  /** True when card checkout is waiting for gateway webhook. */
  pendingPayment?: boolean;
  createdAt: string;
}

const store = recordStore<StorefrontWebOrder>({
  collection: "storefront-orders",
  file: "storefront-orders.json",
});

export async function saveStorefrontWebOrder(
  order: Omit<StorefrontWebOrder, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<StorefrontWebOrder> {
  const row: StorefrontWebOrder = {
    ...order,
    id: order.id ?? `WEB-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: order.createdAt ?? new Date().toISOString(),
  };
  return store.put(row);
}

export async function listStorefrontWebOrders(): Promise<StorefrontWebOrder[]> {
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
  if (isSupabaseEnabled && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
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
    } catch {
      // fall through to session/local store
    }
  }

  const all = await store.list();
  return all.find(match) ?? null;
}

export async function updateStorefrontWebOrder(
  id: string,
  patch: Partial<StorefrontWebOrder>,
): Promise<StorefrontWebOrder | null> {
  const all = await store.list();
  const existing = all.find((o) => o.id === id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  return store.put(next);
}
