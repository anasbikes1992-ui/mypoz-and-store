import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

/** Staff workflow: new → preparing → ready → done (legacy aliases accepted). */
export type ClickCollectStatus =
  | "new"
  | "preparing"
  | "ready"
  | "done"
  | "pending"
  | "picked"
  | "collected";

export interface ClickCollectOrder {
  id: string;
  customer: string;
  phone: string;
  items: string;
  status: ClickCollectStatus;
  note: string;
  source?: "manual" | "storefront";
  saleId?: string | null;
  receiptNo?: string | null;
  createdAt: string;
}

const store = recordStore<ClickCollectOrder>({
  collection: "click-collect-orders",
  file: "click-collect-orders.json",
});

export const CLICK_COLLECT_STATUSES = [
  "new",
  "preparing",
  "ready",
  "done",
] as const;

export function normalizeClickCollectStatus(
  status: string,
): (typeof CLICK_COLLECT_STATUSES)[number] {
  if (status === "pending" || status === "new") return "new";
  if (status === "picked" || status === "preparing") return "preparing";
  if (status === "ready") return "ready";
  if (status === "collected" || status === "done") return "done";
  return "new";
}

export async function listClickCollect(): Promise<ClickCollectOrder[]> {
  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createClickCollect(input: {
  customer: string;
  phone?: string;
  items: string;
  note?: string;
  status?: ClickCollectStatus;
  source?: "manual" | "storefront";
  saleId?: string | null;
  receiptNo?: string | null;
}): Promise<ClickCollectOrder> {
  const order: ClickCollectOrder = {
    id: "CC-" + randomUUID().slice(0, 8).toUpperCase(),
    customer: input.customer.trim(),
    phone: input.phone?.trim() ?? "",
    items: input.items.trim(),
    status: input.status ?? "new",
    note: input.note?.trim() ?? "",
    source: input.source ?? "manual",
    saleId: input.saleId ?? null,
    receiptNo: input.receiptNo ?? null,
    createdAt: new Date().toISOString(),
  };
  return store.put(order);
}

export async function patchClickCollect(
  id: string,
  status: ClickCollectStatus,
): Promise<ClickCollectOrder | null> {
  const current = await store.get(id);
  if (!current) return null;
  return store.put({
    ...current,
    status: normalizeClickCollectStatus(status),
  });
}
