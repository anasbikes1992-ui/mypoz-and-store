import "server-only";
import { writeAudit } from "./audit-store";

/**
 * Stub fiscal / e-invoice provider. Logs an audit event; swap for a real
 * provider later without changing call sites.
 */
export async function logFiscalEvent(sale: {
  id: string;
  total: number;
  paymentMethod: string;
  employee?: string | null;
}): Promise<void> {
  await writeAudit({
    actor: sale.employee?.trim() || "system",
    action: "fiscal.stub",
    entity: "sale",
    entityId: sale.id,
    detail: `stub e-invoice · ${sale.paymentMethod} · ${sale.total}`,
  });
}
