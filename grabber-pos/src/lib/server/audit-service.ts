import "server-only";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Canonical audit API — PostgreSQL audit_events only.
 * Production never falls back to JSON/document stores.
 */

export type AuditListItem = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string;
  metadata?: Record<string, unknown>;
  actorRole?: string | null;
  correlationId?: string | null;
};

export type WriteAuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string | null;
  /** Display label only when session present; ignored as authority. */
  actorLabel?: string | null;
  /** Service-role only (webhooks): required when no user JWT. */
  orgId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  useServiceRole?: boolean;
};

function asJson(value: unknown): Json {
  return value as Json;
}

function mapRow(row: {
  id: number | string;
  created_at: string;
  actor_label?: string | null;
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  actor_role?: string | null;
  correlation_id?: string | null;
}): AuditListItem {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  const details =
    typeof meta.details === "string"
      ? meta.details
      : typeof meta.detail === "string"
        ? meta.detail
        : "";
  return {
    id: String(row.id),
    timestamp: row.created_at,
    actor: row.actor_label || row.actor_id || "system",
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id ?? null,
    details,
    metadata: meta,
    actorRole: row.actor_role ?? null,
    correlationId: row.correlation_id ?? null,
  };
}

export async function writeAuditEvent(
  input: WriteAuditInput,
): Promise<AuditListItem> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      throw new Error("DEPENDENCY_UNAVAILABLE: audit requires database");
    }
    // Explicit demo only — never silent production path.
    return {
      id: `demo-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: input.actorLabel || "demo",
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details ?? "",
      metadata: input.metadata,
    };
  }

  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
  };
  if (input.details) metadata.details = input.details;

  const db = input.useServiceRole
    ? createServiceSupabase()
    : await createServerSupabase();

  const { data, error } = await (db as any).rpc("write_audit_event", {
    p_action: input.action,
    p_entity: input.entity,
    p_entity_id: input.entityId ?? null,
    p_metadata: asJson(metadata),
    p_correlation_id: input.correlationId ?? null,
    p_org_id: input.useServiceRole ? input.orgId ?? null : null,
    p_actor_id: input.useServiceRole ? input.actorId ?? null : null,
    p_actor_role: input.useServiceRole ? input.actorRole ?? null : null,
    p_actor_label: input.actorLabel ?? null,
  });

  if (error) throw new Error(error.message);
  return mapRow(data as any);
}

export async function listAuditEventsFromDb(
  limit = 100,
): Promise<AuditListItem[]> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      throw new Error("DEPENDENCY_UNAVAILABLE: audit requires database");
    }
    return [];
  }

  const db = await createServerSupabase();
  const { data, error } = await (db as any)
    .from("audit_events")
    .select(
      "id, created_at, actor_id, actor_label, actor_role, action, entity, entity_id, metadata, correlation_id",
    )
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(mapRow);
}
