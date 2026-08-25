import "server-only";
import { recordStore } from "./persistence/record-store";

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  actor: string;
  action:
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
  details: string;
  metadata?: Record<string, unknown>;
}

const store = recordStore<AuditLogEvent>({
  collection: "audit-logs",
  file: "audit_logs.json",
});

export async function logAuditEvent(
  action: AuditLogEvent["action"],
  details: string,
  actor = "Cashier",
  metadata?: Record<string, unknown>,
): Promise<AuditLogEvent> {
  const event: AuditLogEvent = {
    id: "AUD-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
    metadata,
  };
  await store.put(event);
  return event;
}

export async function listAuditEvents(limit = 100): Promise<AuditLogEvent[]> {
  return (await store.list())
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
