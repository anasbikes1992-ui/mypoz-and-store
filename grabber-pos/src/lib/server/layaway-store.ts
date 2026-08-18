import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

export interface LayawayDeposit {
  id: string;
  amount: number;
  date: string;
}

export interface Layaway {
  id: string;
  customer: string;
  phone: string;
  total: number;
  deposit: number;
  balance: number;
  status: "active" | "completed" | "cancelled";
  linesSummary: string;
  deposits: LayawayDeposit[];
  createdAt: string;
}

const store = recordStore<Layaway>({
  collection: "layaway",
  file: "layaway.json",
});

function recalc(l: Layaway): Layaway {
  const paidTotal = l.deposits.reduce((s, d) => s + d.amount, 0);
  const balance = Math.max(0, l.total - paidTotal);
  return {
    ...l,
    deposit: paidTotal,
    balance,
    status:
      l.status === "cancelled"
        ? "cancelled"
        : balance <= 0
          ? "completed"
          : "active",
  };
}

export async function listLayaways(): Promise<Layaway[]> {
  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getLayaway(id: string): Promise<Layaway | null> {
  return store.get(id);
}

export async function createLayaway(input: {
  customer: string;
  phone?: string;
  total: number;
  deposit?: number;
  linesSummary?: string;
}): Promise<Layaway> {
  const initial = Math.max(0, Number(input.deposit) || 0);
  const total = Math.max(0, Number(input.total) || 0);
  const deposits: LayawayDeposit[] =
    initial > 0
      ? [
          {
            id: "D-" + randomUUID().slice(0, 6),
            amount: initial,
            date: new Date().toISOString(),
          },
        ]
      : [];
  const raw: Layaway = {
    id: "LAY-" + randomUUID().slice(0, 8).toUpperCase(),
    customer: input.customer.trim(),
    phone: input.phone?.trim() ?? "",
    total,
    deposit: initial,
    balance: Math.max(0, total - initial),
    status: total - initial <= 0 ? "completed" : "active",
    linesSummary: (input.linesSummary ?? "").trim() || "Layaway items",
    deposits,
    createdAt: new Date().toISOString(),
  };
  return store.put(recalc(raw));
}

export async function addLayawayDeposit(
  id: string,
  amount: number,
): Promise<Layaway | null> {
  const current = await store.get(id);
  if (!current) return null;
  if (current.status === "cancelled") return current;
  const dep: LayawayDeposit = {
    id: "D-" + randomUUID().slice(0, 6),
    amount: Math.max(0, Number(amount) || 0),
    date: new Date().toISOString(),
  };
  const next = recalc({
    ...current,
    deposits: [...current.deposits, dep],
  });
  return store.put(next);
}

export async function patchLayaway(
  id: string,
  patch: { status?: Layaway["status"]; linesSummary?: string },
): Promise<Layaway | null> {
  const current = await store.get(id);
  if (!current) return null;
  const next: Layaway = {
    ...current,
    status: patch.status ?? current.status,
    linesSummary: patch.linesSummary?.trim() || current.linesSummary,
  };
  return store.put(recalc(next));
}
