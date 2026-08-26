/**
 * Server-authoritative sale total formula (mirrors create_sale_internal):
 *   linesSum - finalDiscount + serviceCharge + deliveryFee + codFee = total
 * where linesSum = sum((unit - lineDiscount) * qty)
 * and subtotal is sum(unit * qty) before line discounts.
 */
export function reconcileSaleTotals(input: {
  subtotal: number;
  discountTotal: number;
  finalDiscount?: number;
  serviceCharge?: number;
  deliveryFee?: number;
  codFee?: number;
  total: number;
  linesSum?: number;
}): { ok: boolean; expected: number; delta: number } {
  const afterLines =
    input.linesSum != null
      ? Number(input.linesSum)
      : Number(input.subtotal) - Number(input.discountTotal || 0);
  const finalDiscount = Math.max(0, Number(input.finalDiscount || 0));
  const serviceCharge = Math.max(0, Number(input.serviceCharge || 0));
  const deliveryFee = Math.max(0, Number(input.deliveryFee || 0));
  const codFee = Math.max(0, Number(input.codFee || 0));
  const cappedFinal = Math.min(finalDiscount, afterLines);
  const expected =
    afterLines - cappedFinal + serviceCharge + deliveryFee + codFee;
  const delta = Number((Number(input.total) - expected).toFixed(2));
  return { ok: Math.abs(delta) < 0.01, expected, delta };
}

/** Shared display key prefix; payload embeds scope + expiry. */
export const CUSTOMER_DISPLAY_KEY = "grabber-pos-display";
export const CUSTOMER_DISPLAY_TTL_MS = 15 * 60 * 1000;

export interface CustomerDisplayPayload {
  total: number;
  lines: { name: string; qty: number; amount: number }[];
  businessName: string;
  /** tenant · branch · register · shift when known */
  scope: {
    tenant: string;
    branch?: string;
    register?: string;
    session?: string;
  };
  updatedAt: string;
  expiresAt: string;
}

export function buildCustomerDisplayPayload(input: {
  total: number;
  lines: { name: string; qty: number; amount: number }[];
  businessName: string;
  tenant: string;
  branch?: string;
  register?: string;
  session?: string;
  now?: number;
}): CustomerDisplayPayload {
  const now = input.now ?? Date.now();
  return {
    total: input.total,
    lines: input.lines,
    businessName: input.businessName,
    scope: {
      tenant: input.tenant,
      branch: input.branch,
      register: input.register,
      session: input.session,
    },
    updatedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CUSTOMER_DISPLAY_TTL_MS).toISOString(),
  };
}

export function isCustomerDisplayFresh(
  payload: CustomerDisplayPayload,
  now = Date.now(),
): boolean {
  if (!payload?.expiresAt) return false;
  const exp = Date.parse(payload.expiresAt);
  if (!Number.isFinite(exp) || exp < now) return false;
  if (!payload.scope?.tenant) return false;
  return true;
}
