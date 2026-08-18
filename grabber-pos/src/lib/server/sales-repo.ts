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

/**
 * Sales store for the local/demo backend. In the durable backend sales are
 * written by the atomic `create_sale` RPC via SupabaseRepository — this module
 * is the local counterpart, so callers only depend on listSales/createSale.
 */
const SALES_FILE = dataFile("sales.json");

async function readAll(): Promise<Sale[]> {
  return readJsonFile<Sale[]>(SALES_FILE, []);
}

export async function listSales(limit = 100): Promise<Sale[]> {
  const sales = await readAll();
  return sales
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function findSaleById(id: string): Promise<Sale | null> {
  const sales = await readAll();
  return sales.find((s) => s.id === id) ?? null;
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
