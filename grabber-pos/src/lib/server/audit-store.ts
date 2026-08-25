import "server-only";
import {
  listAuditEventsFromDb,
  writeAuditEvent,
  type AuditListItem,
} from "./audit-service";

/**
 * Compatibility facade — writeAudit/listAudit now target SQL audit_events.
 * Do not use app_collections for audit.
 */

export interface AuditEvent {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}

function toEvent(row: AuditListItem): AuditEvent {
  return {
    id: row.id,
    createdAt: row.timestamp,
    actor: row.actor,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId ?? "",
    detail: row.details,
  };
}

export async function writeAudit(input: {
  actor?: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
  orgId?: string;
  useServiceRole?: boolean;
  correlationId?: string;
}): Promise<AuditEvent> {
  const row = await writeAuditEvent({
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    details: input.detail,
    actorLabel: input.actor ?? null,
    orgId: input.orgId ?? null,
    useServiceRole: input.useServiceRole,
    correlationId: input.correlationId ?? null,
  });
  return toEvent(row);
}

export async function listAudit(limit = 100): Promise<AuditEvent[]> {
  const rows = await listAuditEventsFromDb(limit);
  return rows.map(toEvent);
}
