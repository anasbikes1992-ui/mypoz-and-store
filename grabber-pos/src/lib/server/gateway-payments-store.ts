import "server-only";
import { createHash } from "crypto";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import type { CurrencyCode, PayStatus, ProviderKey } from "@/lib/payments/gateways/types";
import type { Json } from "@/lib/supabase/database.types";
import { writeAuditEvent } from "./audit-service";

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
  source?: "storefront" | "pos" | "licence" | "other";
  clientUuid?: string;
}

function asJson(value: unknown): Json {
  return value as Json;
}

function useServiceLedger(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function mapDbStatus(status: string): PayStatus {
  const s = status.toLowerCase();
  if (s === "paid") return "PAID";
  if (s === "failed") return "FAILED";
  if (s === "cancelled") return "CANCELLED";
  if (s === "refunded" || s === "partially_refunded") return "REFUNDED";
  if (s === "authorized") return "PENDING";
  return "PENDING";
}

function toDbStatus(status: PayStatus): string {
  switch (status) {
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    default:
      return "pending";
  }
}

function rowToRecord(row: any): GatewayPaymentRecord {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    id: row.reference,
    reference: row.reference,
    provider: String(row.provider).toUpperCase() as ProviderKey,
    currency: row.currency as CurrencyCode,
    amountMinor: Number(row.amount_minor),
    status: mapDbStatus(String(row.status)),
    orgId: row.org_id,
    description: row.description ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    providerRef: row.provider_ref ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    meta,
    source: row.source,
    clientUuid: row.client_uuid ?? undefined,
    slug: typeof meta.slug === "string" ? meta.slug : undefined,
  };
}

async function resolveOrgIdForSlug(slug: string): Promise<string | null> {
  if (!useServiceLedger()) return null;
  const db = createServiceSupabase();
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
  if (!useServiceLedger()) {
    if (requireSupabase || isSupabaseEnabled) {
      throw new Error(
        "DEPENDENCY_UNAVAILABLE: gateway payments require SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    throw new Error("DEPENDENCY_UNAVAILABLE: gateway payments require Supabase");
  }

  let orgId = input.orgId;
  if (!orgId && input.slug) {
    orgId = (await resolveOrgIdForSlug(input.slug)) ?? undefined;
  }
  if (!orgId) {
    throw new Error(
      "Cannot persist gateway payment: storefront org not found. Check slug and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const status = toDbStatus(input.status ?? "PENDING");
  const meta = {
    ...(input.meta ?? {}),
    slug: input.slug,
  };

  const db = createServiceSupabase();
  const { data, error } = await (db as any)
    .from("payment_intents")
    .upsert(
      {
        org_id: orgId,
        reference: input.reference,
        provider: input.provider,
        currency: input.currency,
        amount_minor: input.amountMinor,
        status,
        description: input.description ?? null,
        customer_name: input.customerName ?? null,
        customer_email: input.customerEmail ?? null,
        provider_ref: input.providerRef ?? null,
        source: input.source ?? (input.meta?.kind === "licence" ? "licence" : "storefront"),
        client_uuid: input.clientUuid ?? null,
        metadata: asJson(meta),
      },
      { onConflict: "org_id,reference" },
    )
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to create payment intent");

  await writeAuditEvent({
    action: "payment.created",
    entity: "payment_intent",
    entityId: input.reference,
    details: `provider=${input.provider} amount_minor=${input.amountMinor}`,
    orgId,
    useServiceRole: true,
    actorLabel: "payments",
    metadata: { provider: input.provider, status },
  });

  return rowToRecord(data);
}

export async function getGatewayPaymentByReference(
  reference: string,
): Promise<GatewayPaymentRecord | null> {
  if (!useServiceLedger()) {
    if (requireSupabase || isSupabaseEnabled) {
      throw new Error(
        "DEPENDENCY_UNAVAILABLE: gateway payments require SUPABASE_SERVICE_ROLE_KEY",
      );
    }
    return null;
  }

  const db = createServiceSupabase();
  const { data, error } = await (db as any)
    .from("payment_intents")
    .select("*")
    .eq("reference", reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToRecord(data) : null;
}

function deterministicEventId(opts: {
  provider: string;
  reference: string;
  status: string;
  providerRef?: string;
  amountMinor?: number;
}): string {
  const raw = [
    opts.provider,
    opts.reference,
    opts.status,
    opts.providerRef ?? "",
    opts.amountMinor ?? "",
  ].join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 64);
}

export async function applyGatewayWebhook(opts: {
  reference: string;
  status: PayStatus;
  provider: ProviderKey | string;
  providerRef?: string;
  amountMinor?: number;
  providerEventId?: string;
  rawPayload?: Record<string, unknown>;
}): Promise<{ ok: true; payment: GatewayPaymentRecord } | { ok: false; reason: string }> {
  if (!useServiceLedger()) {
    return { ok: false, reason: "DEPENDENCY_UNAVAILABLE" };
  }

  const existing = await getGatewayPaymentByReference(opts.reference);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (!existing.orgId) return { ok: false, reason: "MISSING_ORG" };

  if (
    opts.status === "PAID" &&
    typeof opts.amountMinor === "number" &&
    opts.amountMinor !== existing.amountMinor
  ) {
    return { ok: false, reason: "AMOUNT_MISMATCH" };
  }

  const db = createServiceSupabase();
  const provider = String(opts.provider).toUpperCase();
  const eventId =
    opts.providerEventId ||
    deterministicEventId({
      provider,
      reference: opts.reference,
      status: opts.status,
      providerRef: opts.providerRef,
      amountMinor: opts.amountMinor,
    });

  // Load intent id for FK
  const { data: intentRow } = await (db as any)
    .from("payment_intents")
    .select("id")
    .eq("org_id", existing.orgId)
    .eq("reference", opts.reference)
    .maybeSingle();

  const { data: claimed, error: claimError } = await (db as any).rpc(
    "claim_payment_event",
    {
      p_provider: provider,
      p_provider_event_id: eventId,
      p_org_id: existing.orgId,
      p_payment_intent_id: intentRow?.id ?? null,
      p_status: opts.status,
      p_amount_minor: opts.amountMinor ?? existing.amountMinor,
      p_currency: existing.currency,
      p_provider_transaction_id: opts.providerRef ?? null,
      p_payload: asJson(opts.rawPayload ?? {}),
    },
  );

  if (claimError) return { ok: false, reason: `CLAIM_FAILED:${claimError.message}` };

  // Already processed identical event — idempotent success
  if (claimed === false) {
    if (existing.status === "PAID" && opts.status === "PAID") {
      return { ok: true, payment: existing };
    }
    // Same event id claimed earlier; return current state without re-applying side effects
    return { ok: true, payment: existing };
  }

  if (existing.status === "PAID" && opts.status === "PAID") {
    await (db as any).rpc("mark_payment_event_processed", {
      p_provider: provider,
      p_provider_event_id: eventId,
    });
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

  if (opts.status === "PAID") {
    const kind = existing.meta?.kind;
    if (kind === "licence") {
      if (existing.meta?.licenceAppliedAt) {
        await persistIntent(updated);
        await (db as any).rpc("mark_payment_event_processed", {
          p_provider: provider,
          p_provider_event_id: eventId,
        });
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
        await persistIntent(updated);
        await (db as any).rpc("mark_payment_event_processed", {
          p_provider: provider,
          p_provider_event_id: eventId,
        });
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

  await persistIntent(updated);

  await writeAuditEvent({
    action: "payment.webhook",
    entity: "payment_intent",
    entityId: updated.reference,
    details: `status=${opts.status}`,
    orgId: updated.orgId!,
    useServiceRole: true,
    actorLabel: "payments-webhook",
    correlationId: eventId,
    metadata: { provider, status: opts.status },
  });

  await (db as any).rpc("mark_payment_event_processed", {
    p_provider: provider,
    p_provider_event_id: eventId,
  });

  return { ok: true, payment: updated };
}

async function persistIntent(row: GatewayPaymentRecord): Promise<void> {
  if (!row.orgId) throw new Error("MISSING_ORG");
  const db = createServiceSupabase();
  const { error } = await (db as any)
    .from("payment_intents")
    .update({
      status: toDbStatus(row.status),
      provider_ref: row.providerRef ?? null,
      metadata: asJson(row.meta ?? {}),
      sale_id:
        typeof row.meta?.saleId === "string" &&
        /^[0-9a-f-]{36}$/i.test(row.meta.saleId)
          ? row.meta.saleId
          : null,
    })
    .eq("org_id", row.orgId)
    .eq("reference", row.reference);
  if (error) throw new Error(error.message);
}
