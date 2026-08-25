import "server-only";
import {
  listAuditEventsFromDb,
  writeAuditEvent,
  type AuditListItem,
} from "./audit-service";

/**
 * Compatibility facade over canonical audit_events (audit-service).
 * Collection/JSON audit storage is no longer used.
 */

export type AuditLogAction =
  | "cart.item_removed"
  | "price.overridden"
  | "discount.authorized"
  | "drawer.manual_open"
  | "sale.created"
  | "sale.voided"
  | "register.opened"
  | "register.closed"
  | "stocktake.posted"
  | "transfer.approved"
  | "manager.unlock"
  | "licence.payment";

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: AuditLogAction | string;
  details: string;
  metadata?: Record<string, unknown>;
}

function toLogEvent(row: AuditListItem): AuditLogEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    actor: row.actor,
    action: row.action,
    details: row.details,
    metadata: row.metadata,
  };
}

/**
 * @param actorLabel Display-only. Server derives actor_id from session.
 * Client-supplied actor is never authoritative.
 */
export async function logAuditEvent(
  action: AuditLogAction | string,
  details: string,
  actorLabel?: string,
  metadata?: Record<string, unknown>,
): Promise<AuditLogEvent> {
  const row = await writeAuditEvent({
    action,
    entity: "ops",
    entityId: null,
    details,
    metadata,
    actorLabel: actorLabel ?? null,
  });
  return toLogEvent(row);
}

export async function listAuditEvents(limit = 100): Promise<AuditLogEvent[]> {
  const rows = await listAuditEventsFromDb(limit);
  return rows.map(toLogEvent);
}
