import "server-only";
import { PLAN_PRICES_LKR } from "@/lib/billing";
import type { PlanTier } from "@/lib/plans";
import { readTenant, writeTenant } from "./tenant-store";
import { readSettings } from "./settings-store";
import type { GatewayPaymentRecord } from "./gateway-payments-store";
import { createHqTicket } from "./hq-repo";
import { sendEmail } from "@/lib/email/client";
import { licenceRenewedEmail } from "@/lib/email/templates/licence-renewed";
import { licenceInvoiceEmail } from "@/lib/email/templates/licence-invoice";

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

  // Send licence renewed email — best-effort.
  void (async () => {
    try {
      const settings = await readSettings();
      const email = settings.email;
      if (!email) return;
      const businessName = settings.businessName || tenant.brand.businessName || "MyPoz Store";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
      const mail = licenceRenewedEmail({ businessName: "MyPoz", tenantName: businessName, plan: nextPlan, newExpiry: expiry, dashboardUrl: appUrl });
      await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text, tags: [{ name: "type", value: "licence-renewed" }] });
    } catch { /* never block the licence write */ }
  })();
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
  const bankNote = process.env.MYPOS_BANK_INSTRUCTIONS ||
    "Transfer to the MyPoz operating account and send the slip to HQ. Selling stays blocked after expiry until HQ confirms.";

  // Send invoice email to the tenant's billing email — best-effort.
  void (async () => {
    try {
      const settings = await readSettings();
      const email = settings.email;
      if (!email) return;
      const mail = licenceInvoiceEmail({ businessName: "MyPoz", tenantName: opts.tenantName, plan: opts.plan, amountLkr: opts.amountLkr, ticketId: ticket.id, bankInstructions: bankNote });
      await sendEmail({ to: email, subject: mail.subject, html: mail.html, text: mail.text, tags: [{ name: "type", value: "licence-invoice" }] });
    } catch { /* never block the ticket creation */ }
  })();

  return { ticketId: ticket.id, amountLkr: opts.amountLkr, bankNote };
}

export function licenceAmountLkr(plan: PlanTier): number {
  return PLAN_PRICES_LKR[plan];
}
