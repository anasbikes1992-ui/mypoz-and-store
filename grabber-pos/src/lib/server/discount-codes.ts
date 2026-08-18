import "server-only";
import {
  computeDiscount,
  normalizeCode,
  type DiscountCodeRecord,
} from "@/lib/commerce/discount-codes";
import {
  listCollection,
  updateEntity,
} from "@/lib/server/collection-store";

function asRecord(row: Record<string, unknown>): DiscountCodeRecord {
  const kind = String(row.kind ?? "fixed") === "percent" ? "percent" : "fixed";
  return {
    id: String(row.id ?? ""),
    code: String(row.code ?? ""),
    kind,
    amount: Number(row.amount) || 0,
    minSubtotal: Number(row.minSubtotal) || 0,
    maxUses: Number(row.maxUses) || 0,
    usedCount: Number(row.usedCount) || 0,
    expiry: String(row.expiry ?? ""),
    status: String(row.status ?? "active"),
  };
}

export async function findDiscountCode(code: string): Promise<DiscountCodeRecord | null> {
  const needle = normalizeCode(code);
  if (!needle) return null;
  const rows = await listCollection("discount_codes");
  const found = rows.find((r) => normalizeCode(String(r.code ?? "")) === needle);
  return found ? asRecord(found) : null;
}

export async function validateDiscountCode(code: string, subtotal: number) {
  const rec = await findDiscountCode(code);
  if (!rec) return { ok: false as const, error: "Unknown discount code" };
  const result = computeDiscount(rec, subtotal);
  if (!result.ok) return result;
  return { ok: true as const, discount: result.discount, code: rec.code, id: rec.id };
}

export async function consumeDiscountCode(id: string | undefined): Promise<void> {
  if (!id) return;
  const rows = await listCollection("discount_codes");
  const row = rows.find((r) => r.id === id);
  if (!row) return;
  const used = Number(row.usedCount) || 0;
  await updateEntity("discount_codes", id, { usedCount: used + 1 });
}
