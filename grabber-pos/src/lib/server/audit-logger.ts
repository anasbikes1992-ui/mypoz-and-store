import "server-only";
import { docStore } from "./persistence/doc-store";

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

const store = docStore<AuditLogEvent[]>({
  key: "audit_logs",
  file: "audit_logs.json",
});

export async function logAuditEvent(
  action: AuditLogEvent["action"],
  details: string,
  actor = "Cashier",
  metadata?: Record<string, unknown>,
): Promise<AuditLogEvent> {
  const current = await store.read([]);
  const event: AuditLogEvent = {
    id: "AUD-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    actor,
    action,
    details,
    metadata,
  };
  const updated = [event, ...current].slice(0, 500); // keep last 500 logs
  await store.write(updated);
  return event;
}

export async function listAuditEvents(limit = 100): Promise<AuditLogEvent[]> {
  const logs = await store.read([]);
  return logs.slice(0, limit);
}
