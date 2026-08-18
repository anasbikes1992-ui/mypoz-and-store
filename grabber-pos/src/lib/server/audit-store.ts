import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

export interface AuditEvent {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}

const store = recordStore<AuditEvent>({
  collection: "audit-events",
  file: "audit-events.json",
});

export async function writeAudit(input: {
  actor?: string;
  action: string;
  entity: string;
  entityId: string;
  detail?: string;
}): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: "AUD-" + randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
    actor: input.actor?.trim() || "system",
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    detail: input.detail?.trim() || "",
  };
  return store.put(event);
}

export async function listAudit(limit = 100): Promise<AuditEvent[]> {
  return (await store.list())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
