/** Pure discount-code math. Persistence lives in app_collections `discount_codes`. */

export type DiscountKind = "percent" | "fixed";

export type DiscountCodeRecord = {
  id?: string;
  code: string;
  kind: DiscountKind;
  amount: number;
  minSubtotal?: number;
  maxUses?: number;
  usedCount?: number;
  startsAt?: string;
  expiry?: string;
  description?: string;
  status?: string;
};

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function computeDiscount(
  rec: DiscountCodeRecord,
  subtotal: number,
  now = new Date(),
): { ok: true; discount: number } | { ok: false; error: string } {
  const status = (rec.status || "active").toLowerCase();
  if (status !== "active") {
    return { ok: false, error: "This code is not active" };
  }
  if (rec.startsAt) {
    const start = new Date(rec.startsAt);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) {
      return { ok: false, error: "This code is not valid yet" };
    }
  }
  if (rec.expiry) {
    const exp = new Date(rec.expiry);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      return { ok: false, error: "This code has expired" };
    }
  }
  const maxUses = Number(rec.maxUses) || 0;
  const used = Number(rec.usedCount) || 0;
  if (maxUses > 0 && used >= maxUses) {
    return { ok: false, error: "This code has reached its use limit" };
  }
  const min = Number(rec.minSubtotal) || 0;
  if (subtotal < min) {
    return { ok: false, error: `Minimum order is ${min}` };
  }
  const amount = Math.max(0, Number(rec.amount) || 0);
  let discount =
    rec.kind === "percent" ? (subtotal * Math.min(amount, 100)) / 100 : amount;
  discount = Math.min(Math.round(discount * 100) / 100, subtotal);
  if (discount <= 0) {
    return { ok: false, error: "This code does not reduce the total" };
  }
  return { ok: true, discount };
}
