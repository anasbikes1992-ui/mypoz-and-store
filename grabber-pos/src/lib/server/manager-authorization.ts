import "server-only";
import { writeAudit } from "./audit-store";

export type ManagerAuthAction =
  | "discount_override"
  | "price_override"
  | "void_sale"
  | "process_return"
  | "cash_drawer"
  | "transfer_dispatch"
  | "transfer_receive";

export async function recordManagerAuthorization(input: {
  actor: string;
  approver: string;
  action: ManagerAuthAction;
  entity?: string;
  entityId?: string;
  amount?: number | null;
  reason?: string | null;
  branchId?: string | null;
}): Promise<void> {
  const detail = [
    input.reason?.trim(),
    input.amount != null && !Number.isNaN(input.amount)
      ? `amount=${input.amount}`
      : null,
    input.branchId ? `branch=${input.branchId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await writeAudit({
    actor: input.actor,
    action: `manager.${input.action}`,
    entity: input.entity ?? "authorization",
    entityId: input.entityId ?? input.approver,
    detail: detail || `approved by manager`,
  });
}
