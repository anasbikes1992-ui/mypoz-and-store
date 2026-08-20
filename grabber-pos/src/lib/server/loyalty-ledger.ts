import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

export type LedgerKind = "earn" | "redeem" | "adjust" | "expire";

export interface LoyaltyLedgerEntry {
  id: string;
  customerId: string;
  kind: LedgerKind;
  /** Absolute points for earn/redeem/expire; signed delta for adjust. */
  points: number;
  note: string;
  saleId?: string;
  createdAt: string;
}

const store = recordStore<LoyaltyLedgerEntry>({
  collection: "loyalty-ledger",
  file: "loyalty-ledger.json",
});

export async function appendEntry(input: {
  customerId: string;
  kind: LedgerKind;
  points: number;
  note?: string;
  saleId?: string;
}): Promise<LoyaltyLedgerEntry> {
  const points =
    input.kind === "adjust"
      ? Math.trunc(Number(input.points) || 0)
      : Math.max(0, Math.floor(Number(input.points) || 0));

  const entry: LoyaltyLedgerEntry = {
    id: "LL-" + randomUUID().slice(0, 8),
    customerId: input.customerId,
    kind: input.kind,
    points,
    note: (input.note ?? "").trim(),
    saleId: input.saleId,
    createdAt: new Date().toISOString(),
  };
  return store.put(entry);
}

export async function listByCustomer(
  customerId: string,
  limit = 50,
): Promise<LoyaltyLedgerEntry[]> {
  const all = await store.list();
  return all
    .filter((e) => e.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listRecent(limit = 40): Promise<LoyaltyLedgerEntry[]> {
  const all = await store.list();
  return all
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
