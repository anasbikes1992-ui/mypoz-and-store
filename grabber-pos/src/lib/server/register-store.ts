import "server-only";
import { randomUUID } from "crypto";
import { docStore } from "./persistence/doc-store";
import { resolveDb } from "./persistence/backend";

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data, error } = await typed
      .from("shifts")
      .select("id, opened_at, closed_at, status, opening_float, closing_amount, register_id, shift_summaries(opened_by_label, closed_by_label, note, sale_ids, cash_sales_total, card_sales_total, void_total)")
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapShiftRow(data) : null;
  }
  const { current } = await store.read({ current: null });
  return current?.status === "open" ? current : null;
}

export async function openShift(input: {
  openedBy: string;
  openingFloat: number;
  note?: string;
}): Promise<RegisterShift> {
  const db = await resolveDb();
  if (db) {
    const existing = await getOpenShift();
    if (existing) throw new Error("A register shift is already open");
    const typed = db as any;
    const { data: register } = await typed
      .from("registers")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (!register?.id) throw new Error("No register found for this organization");
    const { data: shift, error: shiftError } = await typed
      .from("shifts")
      .insert({
        register_id: register.id,
        opening_float: Math.max(0, input.openingFloat || 0),
        status: "open",
      })
      .select("id, opened_at, closed_at, status, opening_float, closing_amount, register_id")
      .single();
    if (shiftError) throw new Error(shiftError.message);
    const { error: summaryError } = await typed.from("shift_summaries").insert({
      shift_id: shift.id,
      opened_by_label: input.openedBy.trim() || "cashier",
      note: input.note?.trim() || null,
    });
    if (summaryError) throw new Error(summaryError.message);
    return mapShiftRow({
      ...shift,
      shift_summaries: {
        opened_by_label: input.openedBy.trim() || "cashier",
        closed_by_label: null,
        note: input.note?.trim() || null,
        sale_ids: [],
        cash_sales_total: 0,
        card_sales_total: 0,
        void_total: 0,
      },
    });
  }

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
  const db = await resolveDb();
  if (db) {
    const shift = await getOpenShift();
    if (!shift) return;
    if (shift.saleIds.includes(sale.id)) return;
    const typed = db as any;
    const saleIds = [...shift.saleIds, sale.id];
    let cashSalesTotal = shift.cashSalesTotal;
    let cardSalesTotal = shift.cardSalesTotal;
    if (sale.paymentMethod === "cash" || sale.paymentMethod === "split") {
      cashSalesTotal +=
        sale.paymentMethod === "cash"
          ? sale.total
          : Math.min(sale.total, Number(sale.cashReceived) || 0);
    }
    if (sale.paymentMethod === "card" || sale.paymentMethod === "split") {
      const cashPart = sale.paymentMethod === "split" ? Number(sale.cashReceived) || 0 : 0;
      cardSalesTotal += sale.paymentMethod === "card" ? sale.total : Math.max(0, sale.total - cashPart);
    }
    if (sale.paymentMethod === "wholesale") {
      cashSalesTotal += sale.total;
    }
    const { error } = await typed
      .from("shift_summaries")
      .update({
        sale_ids: saleIds,
        cash_sales_total: cashSalesTotal,
        card_sales_total: cardSalesTotal,
      })
      .eq("shift_id", shift.id);
    if (error) throw new Error(error.message);
    return;
  }

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
  const db = await resolveDb();
  if (db) {
    const shift = await getOpenShift();
    if (!shift) return;
    const typed = db as any;
    const { error } = await typed
      .from("shift_summaries")
      .update({ void_total: shift.voidTotal + Math.max(0, amount) })
      .eq("shift_id", shift.id);
    if (error) throw new Error(error.message);
    return;
  }

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
  const db = await resolveDb();
  if (db) {
    const shift = await getOpenShift();
    if (!shift) throw new Error("No open shift");
    const expectedCash = shift.openingFloat + shift.cashSalesTotal - shift.voidTotal;
    const typed = db as any;
    const closedAt = new Date().toISOString();
    const { error: shiftError } = await typed
      .from("shifts")
      .update({
        status: "closed",
        closed_at: closedAt,
        closing_amount: Math.max(0, input.closingDeclared || 0),
      })
      .eq("id", shift.id);
    if (shiftError) throw new Error(shiftError.message);
    const { error: summaryError } = await typed
      .from("shift_summaries")
      .update({
        closed_by_label: input.closedBy.trim() || "cashier",
        note: input.note?.trim() || shift.note,
      })
      .eq("shift_id", shift.id);
    if (summaryError) throw new Error(summaryError.message);
    return {
      ...shift,
      status: "closed",
      closedAt,
      closedBy: input.closedBy.trim() || "cashier",
      closingDeclared: Math.max(0, input.closingDeclared || 0),
      expectedCash,
      variance: Math.max(0, input.closingDeclared || 0) - expectedCash,
      note: input.note?.trim() || shift.note,
    };
  }

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data, error } = await typed
      .from("shifts")
      .select("id, opened_at, closed_at, status, opening_float, closing_amount, register_id, shift_summaries(opened_by_label, closed_by_label, note, sale_ids, cash_sales_total, card_sales_total, void_total)")
      .order("opened_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map(mapShiftRow);
  }
  return (await history.read([])).slice(0, limit);
}

function mapShiftRow(row: any): RegisterShift {
  const summary = Array.isArray(row.shift_summaries) ? row.shift_summaries[0] : row.shift_summaries;
  const saleIds = Array.isArray(summary?.sale_ids) ? summary.sale_ids.map(String) : [];
  const cashSalesTotal = Number(summary?.cash_sales_total ?? 0);
  const cardSalesTotal = Number(summary?.card_sales_total ?? 0);
  const voidTotal = Number(summary?.void_total ?? 0);
  const openingFloat = Number(row.opening_float ?? 0);
  const closingDeclared = row.closing_amount != null ? Number(row.closing_amount) : null;
  const expectedCash =
    row.status === "closed" ? openingFloat + cashSalesTotal - voidTotal : null;
  return {
    id: row.id,
    openedAt: row.opened_at,
    closedAt: row.closed_at ?? null,
    status: row.status,
    openedBy: summary?.opened_by_label ?? "cashier",
    closedBy: summary?.closed_by_label ?? null,
    openingFloat,
    closingDeclared,
    expectedCash,
    variance:
      closingDeclared != null && expectedCash != null ? closingDeclared - expectedCash : null,
    note: summary?.note ?? null,
    saleIds,
    cashSalesTotal,
    cardSalesTotal,
    voidTotal,
  };
}
