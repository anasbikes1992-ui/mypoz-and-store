import "server-only";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "./persistence/local-json";
import type { CurrencyCode, PayStatus, ProviderKey } from "@/lib/payments/gateways/types";
import type { Json } from "@/lib/supabase/database.types";

export interface GatewayPaymentRecord {
  id: string;
  reference: string;
  provider: ProviderKey;
  currency: CurrencyCode;
  amountMinor: number;
  status: PayStatus;
  slug?: string;
  orgId?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  providerRef?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, unknown>;
}

const COLLECTION = "gateway-payments";
const LOCAL_FILE = dataFile("gateway-payments.json");

function asJson(value: unknown): Json {
  return value as Json;
}

function useServiceLedger(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readLocal(): Promise<GatewayPaymentRecord[]> {
  const raw = await readJsonFile<unknown>(LOCAL_FILE, []);
  return Array.isArray(raw) ? (raw as GatewayPaymentRecord[]) : [];
}

async function putLocal(row: GatewayPaymentRecord): Promise<GatewayPaymentRecord> {
  return withFileLock(LOCAL_FILE, async () => {
    const items = await readLocal();
    const exists = items.some((r) => r.id === row.id);
    await writeJsonFile(
      LOCAL_FILE,
      exists ? items.map((r) => (r.id === row.id ? row : r)) : [...items, row],
    );
    return row;
  });
}

async function resolveOrgIdForSlug(slug: string): Promise<string | null> {
  if (!useServiceLedger()) return null;
  const db = createServiceSupabase();
  // storefronts table exists in migration 0007 but is not yet in generated Database types.
  const { data, error } = await db
    .from("storefronts" as "organizations")
    .select("org_id" as "id")
    .eq("slug" as "id", slug)
    .maybeSingle();
  if (error) return null;
  const row = data as unknown as { org_id?: string } | null;
  return row?.org_id ?? null;
}

export async function createGatewayPayment(
  input: Omit<GatewayPaymentRecord, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: PayStatus;
  },
): Promise<GatewayPaymentRecord> {
  const now = new Date().toISOString();
  let orgId = input.orgId;
  if (!orgId && input.slug && useServiceLedger()) {
    orgId = (await resolveOrgIdForSlug(input.slug)) ?? undefined;
  }

  const row: GatewayPaymentRecord = {
    ...input,
    id: input.reference,
    orgId,
    status: input.status ?? "PENDING",
    createdAt: now,
    updatedAt: now,
  };

  if (!useServiceLedger()) {
    return putLocal(row);
  }

  if (!orgId) {
    // Supabase on but storefront/org unknown — refuse rather than write ephemeral disk on Vercel.
    throw new Error(
      "Cannot persist gateway payment: storefront org not found. Check slug and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const db = createServiceSupabase();
  const { error } = await db.from("app_collections").upsert(
    {
      org_id: orgId,
      collection: COLLECTION,
      entity_id: row.id,
      data: asJson(row),
    },
    { onConflict: "org_id,collection,entity_id" },
  );
  if (error) throw new Error(error.message);
  return row;
}

export async function getGatewayPaymentByReference(
  reference: string,
): Promise<GatewayPaymentRecord | null> {
  if (!useServiceLedger()) {
    return (await readLocal()).find((r) => r.id === reference || r.reference === reference) ?? null;
  }

  const db = createServiceSupabase();
  const { data, error } = await db
    .from("app_collections")
    .select("data")
    .eq("collection", COLLECTION)
    .eq("entity_id", reference)
    .maybeSingle<{ data: unknown }>();
  if (error) throw new Error(error.message);
  return (data?.data as GatewayPaymentRecord | undefined) ?? null;
}

export async function applyGatewayWebhook(opts: {
  reference: string;
  status: PayStatus;
  providerRef?: string;
  amountMinor?: number;
}): Promise<{ ok: true; payment: GatewayPaymentRecord } | { ok: false; reason: string }> {
  const existing = await getGatewayPaymentByReference(opts.reference);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  if (
    opts.status === "PAID" &&
    typeof opts.amountMinor === "number" &&
    opts.amountMinor !== existing.amountMinor
  ) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }

  // Already settled — idempotent
  if (existing.status === "PAID" && opts.status === "PAID") {
    return { ok: true, payment: existing };
  }

  const updated: GatewayPaymentRecord = {
    ...existing,
    status: opts.status,
    providerRef: opts.providerRef ?? existing.providerRef,
    updatedAt: new Date().toISOString(),
    meta: {
      ...(existing.meta ?? {}),
      lastWebhook: opts.status,
      at: new Date().toISOString(),
    },
  };

  // ONLY verified PAID transitions complete the sale and decrement stock.
  if (opts.status === "PAID") {
    const kind = existing.meta?.kind;
    if (kind === "licence") {
      if (existing.meta?.licenceAppliedAt) {
        return { ok: true, payment: existing };
      }
      const { applyLicencePayment } = await import("@/lib/server/licence-payment");
      await applyLicencePayment(updated);
      updated.meta = {
        ...updated.meta,
        licenceAppliedAt: new Date().toISOString(),
      };
    } else {
      if (existing.meta?.completedAt) {
        return { ok: true, payment: existing };
      }
      const saleRef =
        (typeof existing.meta?.saleId === "string" && existing.meta.saleId) ||
        existing.reference;
      try {
        const { completePendingSale } = await import("@/lib/server/complete-pending-sale");
        const { fulfillPendingStorefrontBoards } = await import(
          "@/lib/server/storefront-repo"
        );
        const sale = await completePendingSale(saleRef);
        await fulfillPendingStorefrontBoards(sale.id, existing.reference);
        updated.meta = {
          ...updated.meta,
          saleId: sale.id,
          completedAt: new Date().toISOString(),
        };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "complete_failed";
        if (!msg.startsWith("SALE_NOT_PENDING") && !msg.includes("already")) {
          console.error("[applyGatewayWebhook] completePendingSale failed:", msg);
          return { ok: false, reason: `SALE_COMPLETE_FAILED:${msg}` };
        }
      }
    }
  }

  if (!useServiceLedger()) {
    await putLocal(updated);
    return { ok: true, payment: updated };
  }

  const orgId = updated.orgId;
  if (!orgId) return { ok: false, reason: "MISSING_ORG" };

  const db = createServiceSupabase();
  const { error } = await db.from("app_collections").upsert(
    {
      org_id: orgId,
      collection: COLLECTION,
      entity_id: updated.id,
      data: asJson(updated),
    },
    { onConflict: "org_id,collection,entity_id" },
  );
  if (error) throw new Error(error.message);
  return { ok: true, payment: updated };
}
