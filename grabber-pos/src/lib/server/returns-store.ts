import "server-only";
import { resolveDb } from "./persistence/backend";

export interface SaleReturnLineRecord {
  id: string;
  saleLineId: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  disposition: "restock" | "damage" | "discard";
}

export interface RefundRecord {
  id: string;
  method: "cash" | "original" | "store_credit";
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface SaleReturnRecord {
  id: string;
  saleId: string;
  branchId: string;
  reason: string;
  note: string | null;
  status: "draft" | "approved" | "cancelled";
  createdAt: string;
  lines: SaleReturnLineRecord[];
  refund: RefundRecord | null;
}

export async function listReturns(): Promise<SaleReturnRecord[]> {
  const db = await resolveDb();
  if (!db) return [];
  const typed = db as any;
  const { data, error } = await typed
    .from("sale_returns")
    .select("id, sale_id, branch_id, reason, note, status, created_at, sale_return_lines(id, sale_line_id, product_id, quantity, unit_price, refund_amount, disposition), refunds(id, method, amount, note, created_at)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map(mapReturnRow);
}

export async function createReturn(input: {
  saleId: string;
  reason: string;
  note?: string;
  refundMethod?: "cash" | "original" | "store_credit";
  refundNote?: string;
  lines: {
    saleLineId: string;
    quantity: number;
    disposition?: "restock" | "damage" | "discard";
  }[];
}): Promise<SaleReturnRecord> {
  const db = await resolveDb();
  if (!db) throw new Error("Returns require the durable database");
  const typed = db as any;

  let saleId = input.saleId;
  let saleQuery = typed.from("sales").select("id, branch_id, status");
  if (/^[0-9a-f-]{36}$/i.test(saleId)) {
    saleQuery = saleQuery.eq("id", saleId);
  } else {
    saleQuery = saleQuery.eq("receipt_no", saleId);
  }
  const { data: sale, error: saleError } = await saleQuery.maybeSingle();
  if (saleError) throw new Error(saleError.message);
  if (!sale) throw new Error("Sale not found");
  if (sale.status === "voided") throw new Error("Cannot return a voided sale");
  saleId = sale.id;

  const ids = [...new Set(input.lines.map((line) => line.saleLineId))];
  const { data: saleLines, error: lineError } = await typed
    .from("sale_lines")
    .select("id, product_id, quantity, unit_price, line_total")
    .in("id", ids)
    .eq("sale_id", saleId);
  if (lineError) throw new Error(lineError.message);
  const lineMap = new Map(((saleLines ?? []) as any[]).map((line) => [line.id, line]));

  const normalized = input.lines.map((line) => {
    const saleLine = lineMap.get(line.saleLineId);
    if (!saleLine) throw new Error(`Sale line not found: ${line.saleLineId}`);
    const quantity = Number(line.quantity);
    if (!(quantity > 0) || quantity > Number(saleLine.quantity ?? 0)) {
      throw new Error(`Invalid return quantity for line ${line.saleLineId}`);
    }
    const unitPrice = Number(saleLine.unit_price ?? 0);
    return {
      saleLineId: line.saleLineId,
      productId: saleLine.product_id ?? null,
      quantity,
      unitPrice,
      refundAmount: unitPrice * quantity,
      disposition: line.disposition ?? "restock",
    };
  });

  const { data: inserted, error: insertError } = await typed
    .from("sale_returns")
    .insert({
      sale_id: saleId,
      branch_id: sale.branch_id,
      reason: input.reason.trim(),
      note: input.note?.trim() || null,
      status: "approved",
    })
    .select("id, sale_id, branch_id, reason, note, status, created_at")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { data: returnLines, error: returnLineError } = await typed
    .from("sale_return_lines")
    .insert(
      normalized.map((line) => ({
        return_id: inserted.id,
        sale_line_id: line.saleLineId,
        product_id: line.productId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        refund_amount: line.refundAmount,
        disposition: line.disposition,
      })),
    )
    .select("id, sale_line_id, product_id, quantity, unit_price, refund_amount, disposition");
  if (returnLineError) throw new Error(returnLineError.message);

  for (const line of normalized) {
    if (line.disposition !== "restock" || !line.productId) continue;
    const { error: adjustError } = await typed.rpc("adjust_stock", {
      p_branch: sale.branch_id,
      p_product: line.productId,
      p_delta: line.quantity,
      p_note: `return:${inserted.id}`,
      p_reason: "return",
      p_reference_id: inserted.id,
    });
    if (adjustError) throw new Error(adjustError.message);
  }

  let refund: RefundRecord | null = null;
  if (input.refundMethod) {
    const refundAmount = normalized.reduce((sum, line) => sum + line.refundAmount, 0);
    const { data: refundRow, error: refundError } = await typed
      .from("refunds")
      .insert({
        return_id: inserted.id,
        sale_id: saleId,
        method: input.refundMethod,
        amount: refundAmount,
        note: input.refundNote?.trim() || null,
      })
      .select("id, method, amount, note, created_at")
      .single();
    if (refundError) throw new Error(refundError.message);

    const { error: refundLineError } = await typed.from("refund_lines").insert(
      ((returnLines ?? []) as any[]).map((line) => ({
        refund_id: refundRow.id,
        return_line_id: line.id,
        amount: Number(line.refund_amount ?? 0),
      })),
    );
    if (refundLineError) throw new Error(refundLineError.message);

    refund = {
      id: refundRow.id,
      method: refundRow.method,
      amount: Number(refundRow.amount ?? 0),
      note: refundRow.note ?? null,
      createdAt: refundRow.created_at,
    };
  }

  return {
    id: inserted.id,
    saleId: inserted.sale_id,
    branchId: inserted.branch_id,
    reason: inserted.reason,
    note: inserted.note ?? null,
    status: inserted.status,
    createdAt: inserted.created_at,
    lines: ((returnLines ?? []) as any[]).map(mapReturnLine),
    refund,
  };
}

function mapReturnRow(row: any): SaleReturnRecord {
  const refund = Array.isArray(row.refunds) ? row.refunds[0] : row.refunds;
  return {
    id: row.id,
    saleId: row.sale_id,
    branchId: row.branch_id,
    reason: row.reason,
    note: row.note ?? null,
    status: row.status,
    createdAt: row.created_at,
    lines: ((row.sale_return_lines ?? []) as any[]).map(mapReturnLine),
    refund: refund
      ? {
          id: refund.id,
          method: refund.method,
          amount: Number(refund.amount ?? 0),
          note: refund.note ?? null,
          createdAt: refund.created_at,
        }
      : null,
  };
}

function mapReturnLine(line: any): SaleReturnLineRecord {
  return {
    id: line.id,
    saleLineId: line.sale_line_id,
    productId: line.product_id ?? null,
    quantity: Number(line.quantity ?? 0),
    unitPrice: Number(line.unit_price ?? 0),
    refundAmount: Number(line.refund_amount ?? 0),
    disposition: line.disposition,
  };
}
