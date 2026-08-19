import "server-only";
import { PLAN_PRICES_LKR } from "@/lib/billing";
import type { PlanTier } from "@/lib/plans";
import { readTenant, writeTenant } from "./tenant-store";
import type { GatewayPaymentRecord } from "./gateway-payments-store";
import { createHqTicket } from "./hq-repo";

/** Extend licence 30 days from today (or current expiry, whichever is later). */
export function nextLicenceExpiry(currentExpiry: string, from = new Date()): string {
  const now = from.getTime();
  const existing = currentExpiry ? new Date(currentExpiry).getTime() : 0;
  const base = !Number.isNaN(existing) && existing > now ? existing : now;
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + 30);
  return next.toISOString().slice(0, 10);
}

export async function applyLicencePayment(payment: GatewayPaymentRecord): Promise<void> {
  const plan = String(payment.meta?.plan ?? "") as PlanTier;
  const tenant = await readTenant();
  const nextPlan: PlanTier =
    plan === "starter" || plan === "business" || plan === "enterprise"
      ? plan
      : tenant.license.plan;
  const expiry = nextLicenceExpiry(tenant.license.expiry);
  await writeTenant({
    license: {
      plan: nextPlan,
      expiry,
      extras: tenant.license.extras,
    },
  });
}

export async function recordLicenceInvoice(opts: {
  plan: PlanTier;
  amountLkr: number;
  tenantName: string;
}): Promise<{ ticketId: string; amountLkr: number; bankNote: string }> {
  const ticket = await createHqTicket({
    subject: `Invoice: ${opts.plan} licence`,
    body: [
      `Collect LKR ${opts.amountLkr.toLocaleString("en-LK")} for ${opts.plan}.`,
      "After bank slip is confirmed, HQ sets licence expiry on the tenant.",
      `create_sale already refuses expired licences.`,
    ].join("\n"),
    tenantId: opts.tenantName,
    tenantName: opts.tenantName,
    priority: "high",
  });
  return {
    ticketId: ticket.id,
    amountLkr: opts.amountLkr,
    bankNote:
      process.env.MYPOS_BANK_INSTRUCTIONS ||
      "Transfer to the MyPoz operating account and send the slip to HQ. Selling stays blocked after expiry until HQ confirms.",
  };
}

export function licenceAmountLkr(plan: PlanTier): number {
  return PLAN_PRICES_LKR[plan];
}
