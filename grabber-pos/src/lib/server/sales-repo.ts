import "server-only";
import { randomUUID } from "crypto";
import type { Sale } from "@/lib/types";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "./persistence/local-json";
import { assertLicenceActive } from "./licence-guard";
import { recordVoidOnShift } from "./register-store";
import { writeAudit } from "./audit-store";
import { isSupabaseEnabled } from "@/lib/supabase/config";

/**
 * Sales store for the local/demo backend. In the durable backend sales are
 * written by the atomic `create_sale` RPC via SupabaseRepository — this module
 * is the local counterpart, so callers only depend on listSales/createSale.
 */
const SALES_FILE = dataFile("sales.json");

const SALE_SELECT =
  "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, delivery_fee, cod_fee, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, source, status, fulfillment_status, payment_status, sale_lines(id, product_id, name, unit_price, quantity, discount, line_total)";

async function readAll(): Promise<Sale[]> {
  return readJsonFile<Sale[]>(SALES_FILE, []);
}

function mapDurableSale(row: Record<string, unknown>): Sale {
  const rawLines = (row.sale_lines ?? row.lines ?? []) as Record<
    string,
    unknown
  >[];
  return {
    id: String(row.id),
    receiptNo: row.receipt_no ? String(row.receipt_no) : undefined,
    createdAt: String(row.created_at),
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total ?? 0),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    codFee: Number(row.cod_fee ?? 0),
    total: Number(row.total),
    paymentMethod: (row.payment_method as Sale["paymentMethod"]) ?? "cash",
    isWholesale: row.payment_method === "wholesale",
    customerName: (row.customer_name as string) ?? null,
    customerMobile: (row.customer_mobile as string) ?? null,
    employee: (row.employee as string) ?? null,
    cashReceived:
      row.cash_received != null ? Number(row.cash_received) : null,
    change: row.change_due != null ? Number(row.change_due) : null,
    status: (row.status as Sale["status"]) ?? "completed",
    voidReason: null,
    voidedAt: null,
    source: (row.source as Sale["source"]) ?? "POS",
    fulfillmentStatus: row.fulfillment_status
      ? String(row.fulfillment_status)
      : undefined,
    paymentStatus: row.payment_status
      ? String(row.payment_status)
      : undefined,
    lines: rawLines.map((l) => ({
      id: l.id ? String(l.id) : undefined,
      productId: String(l.product_id ?? ""),
      name: String(l.name ?? ""),
      unitPrice: Number(l.unit_price ?? 0),
      quantity: Number(l.quantity ?? 0),
      discount: Number(l.discount ?? 0),
      lineTotal: Number(l.line_total ?? 0),
    })),
  };
}

/** Look up by durable UUID id or human receipt_no (production + local). */
export async function findSaleById(id: string): Promise<Sale | null> {
  const key = id.trim();
  if (!key) return null;

  if (isSupabaseEnabled) {
    try {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const db = await createServerSupabase();
      const byId = await (db.from("sales") as any)
        .select(SALE_SELECT)
        .eq("id", key)
        .maybeSingle();
      if (byId.data) {
        return mapDurableSale(byId.data as Record<string, unknown>);
      }

      const byReceipt = await (db.from("sales") as any)
        .select(SALE_SELECT)
        .eq("receipt_no", key)
        .maybeSingle();
      if (byReceipt.data) {
        return mapDurableSale(byReceipt.data as Record<string, unknown>);
      }
    } catch {
      // Fall through to local demo store.
    }
  }

  const sales = await readAll();
  return (
    sales.find(
      (s) =>
        s.id === key ||
        s.receiptNo === key ||
        s.id.toUpperCase() === key.toUpperCase() ||
        s.receiptNo?.toUpperCase() === key.toUpperCase(),
    ) ?? null
  );
}

export async function listSales(limit = 100): Promise<Sale[]> {
  const sales = await readAll();
  return sales
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function createSale(
  input: Omit<Sale, "id" | "createdAt">,
): Promise<Sale> {
  await assertLicenceActive();

  const sale: Sale = {
    ...input,
    id: "S-" + randomUUID().slice(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
    status: input.status ?? "completed",
  };

  // Serialized so two concurrent sales can't read the same snapshot and drop
  // one of the receipts.
  await withFileLock(SALES_FILE, async () => {
    const sales = await readAll();
    await writeJsonFile(SALES_FILE, [...sales, sale]);
  });
  return sale;
}

/**
 * Mark a sale as voided. Idempotent — already-voided sales are returned as-is
 * without re-recording shift/audit side effects.
 */
export async function voidSale(
  id: string,
  reason: string,
  actor = "cashier",
): Promise<Sale> {
  let result: Sale | null = null;
  let newlyVoided = false;

  await withFileLock(SALES_FILE, async () => {
    const sales = await readAll();
    const idx = sales.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Sale not found: ${id}`);

    const existing = sales[idx];
    if (existing.status === "voided") {
      result = existing;
      return;
    }

    const voided: Sale = {
      ...existing,
      status: "voided",
      voidReason: reason.trim() || "No reason given",
      voidedAt: new Date().toISOString(),
    };
    sales[idx] = voided;
    await writeJsonFile(SALES_FILE, sales);
    result = voided;
    newlyVoided = true;
  });

  if (!result) throw new Error(`Sale not found: ${id}`);

  const voidedSale: Sale = result;

  if (newlyVoided) {
    await recordVoidOnShift(voidedSale.total);
    await writeAudit({
      actor,
      action: "sale.void",
      entity: "sale",
      entityId: voidedSale.id,
      detail: voidedSale.voidReason ?? reason,
    });
  }

  return voidedSale;
}

export async function salesStats() {
  const sales = await readAll();
  const active = sales.filter((s) => s.status !== "voided");
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = active.filter((s) => s.createdAt.startsWith(today));
  return {
    todayCount: todaySales.length,
    todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
    totalCount: active.length,
    totalRevenue: active.reduce((sum, s) => sum + s.total, 0),
  };
}
