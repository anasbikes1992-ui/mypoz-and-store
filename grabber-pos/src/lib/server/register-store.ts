import "server-only";
import { randomUUID } from "crypto";
import { docStore } from "./persistence/doc-store";

export type ShiftStatus = "open" | "closed";

export interface RegisterShift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: ShiftStatus;
  openedBy: string;
  closedBy: string | null;
  openingFloat: number;
  closingDeclared: number | null;
  expectedCash: number | null;
  variance: number | null;
  note: string | null;
  saleIds: string[];
  cashSalesTotal: number;
  cardSalesTotal: number;
  voidTotal: number;
}

const store = docStore<{ current: RegisterShift | null }>({
  key: "register_shift",
  file: "register-shift.json",
});

const history = docStore<RegisterShift[]>({
  key: "register_shift_history",
  file: "register-shift-history.json",
});

export async function getOpenShift(): Promise<RegisterShift | null> {
  const { current } = await store.read({ current: null });
  return current?.status === "open" ? current : null;
}

export async function openShift(input: {
  openedBy: string;
  openingFloat: number;
  note?: string;
}): Promise<RegisterShift> {
  const existing = await getOpenShift();
  if (existing) throw new Error("A register shift is already open");
  const shift: RegisterShift = {
    id: "SH-" + randomUUID().slice(0, 8).toUpperCase(),
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: "open",
    openedBy: input.openedBy.trim() || "cashier",
    closedBy: null,
    openingFloat: Math.max(0, input.openingFloat || 0),
    closingDeclared: null,
    expectedCash: null,
    variance: null,
    note: input.note?.trim() || null,
    saleIds: [],
    cashSalesTotal: 0,
    cardSalesTotal: 0,
    voidTotal: 0,
  };
  await store.write({ current: shift });
  return shift;
}

export async function recordSaleOnShift(sale: {
  id: string;
  total: number;
  paymentMethod: string;
  cashReceived?: number | null;
}): Promise<void> {
  const shift = await getOpenShift();
  if (!shift) return;
  if (shift.saleIds.includes(sale.id)) return;
  shift.saleIds.push(sale.id);
  if (sale.paymentMethod === "cash" || sale.paymentMethod === "split") {
    shift.cashSalesTotal +=
      sale.paymentMethod === "cash"
        ? sale.total
        : Math.min(sale.total, Number(sale.cashReceived) || 0);
  }
  if (sale.paymentMethod === "card" || sale.paymentMethod === "split") {
    const cashPart =
      sale.paymentMethod === "split" ? Number(sale.cashReceived) || 0 : 0;
    shift.cardSalesTotal +=
      sale.paymentMethod === "card" ? sale.total : Math.max(0, sale.total - cashPart);
  }
  if (sale.paymentMethod === "wholesale") {
    shift.cashSalesTotal += sale.total;
  }
  await store.write({ current: shift });
}

export async function recordVoidOnShift(amount: number): Promise<void> {
  const shift = await getOpenShift();
  if (!shift) return;
  shift.voidTotal += Math.max(0, amount);
  await store.write({ current: shift });
}

export async function xReport(): Promise<{
  shift: RegisterShift;
  expectedCash: number;
}> {
  const shift = await getOpenShift();
  if (!shift) throw new Error("No open shift");
  const expectedCash =
    shift.openingFloat + shift.cashSalesTotal - shift.voidTotal;
  return { shift, expectedCash };
}

export async function closeShift(input: {
  closedBy: string;
  closingDeclared: number;
  note?: string;
}): Promise<RegisterShift> {
  const shift = await getOpenShift();
  if (!shift) throw new Error("No open shift");
  const expectedCash =
    shift.openingFloat + shift.cashSalesTotal - shift.voidTotal;
  const closed: RegisterShift = {
    ...shift,
    status: "closed",
    closedAt: new Date().toISOString(),
    closedBy: input.closedBy.trim() || "cashier",
    closingDeclared: Math.max(0, input.closingDeclared || 0),
    expectedCash,
    variance: Math.max(0, input.closingDeclared || 0) - expectedCash,
    note: input.note?.trim() || shift.note,
  };
  await store.write({ current: null });
  const hist = await history.read([]);
  await history.write([closed, ...hist].slice(0, 200));
  return closed;
}

export async function listShiftHistory(limit = 50): Promise<RegisterShift[]> {
  return (await history.read([])).slice(0, limit);
}
