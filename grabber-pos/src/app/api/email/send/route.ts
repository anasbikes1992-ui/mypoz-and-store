import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { orderConfirmationEmail } from "@/lib/email/templates/order-confirmation";
import { registrationEmail } from "@/lib/email/templates/registration";
import { licenceInvoiceEmail } from "@/lib/email/templates/licence-invoice";
import { licenceRenewedEmail } from "@/lib/email/templates/licence-renewed";
import { licenceExpiryWarningEmail } from "@/lib/email/templates/licence-expiry-warning";
import { staffInviteEmail } from "@/lib/email/templates/staff-invite";
import { lowStockAlertEmail } from "@/lib/email/templates/low-stock-alert";
import { dailySummaryEmail } from "@/lib/email/templates/daily-summary";
import { refundConfirmationEmail } from "@/lib/email/templates/refund-confirmation";
import { complianceDataRequestEmail } from "@/lib/email/templates/compliance-data-request";
import { newTenantWelcomeEmail } from "@/lib/email/templates/new-tenant-welcome";
import { readSettings } from "@/lib/server/settings-store";
import { readTenant } from "@/lib/server/tenant-store";

const sendSchema = z.object({
  template: z.enum([
    "order-confirmation",
    "registration",
    "licence-invoice",
    "licence-renewed",
    "licence-expiry-warning",
    "staff-invite",
    "low-stock-alert",
    "daily-summary",
    "refund-confirmation",
    "compliance-data-request",
    "new-tenant-welcome",
  ]),
  to: z.string().email(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const settings = await readSettings();
  const tenant = await readTenant();
  const businessName = settings.businessName || tenant.brand.businessName || "MyPoz Store";
  const accentColor = tenant.brand.accentColor || "#2563eb";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";

  const { template, to, data = {} } = parsed.data;

  // Build the email from the requested template with sensible defaults.
  let email: { html: string; subject: string; text: string };

  switch (template) {
    case "order-confirmation":
      email = orderConfirmationEmail({
        businessName, accentColor,
        receiptNo: String(data.receiptNo ?? "ORD-001"),
        customerName: String(data.customerName ?? "Customer"),
        items: (data.items as { name: string; qty: number; price: string }[]) ?? [{ name: "Sample product", qty: 1, price: "Rs 1,000" }],
        subtotal: String(data.subtotal ?? "Rs 1,000"),
        total: String(data.total ?? "Rs 1,000"),
        paymentMethod: String(data.paymentMethod ?? "Cash"),
        fulfilment: String(data.fulfilment ?? "courier"),
        address: data.address as string | undefined,
        ordersUrl: `${appUrl}/commerce/orders`,
      }); break;

    case "registration":
      email = registrationEmail({
        businessName, accentColor,
        customerName: String(data.customerName ?? "Customer"),
        email: to,
        loginUrl: `${appUrl}/store/${settings.storeSlug}/account`,
      }); break;

    case "licence-invoice":
      email = licenceInvoiceEmail({
        businessName: "MyPoz", accentColor,
        tenantName: businessName,
        plan: String(data.plan ?? tenant.license.plan),
        amountLkr: Number(data.amountLkr ?? 4500),
        ticketId: String(data.ticketId ?? "TKT-001"),
        bankInstructions: process.env.MYPOS_BANK_INSTRUCTIONS ?? "Transfer to MyPoz operating account and send the slip to support@mypoz.lk",
      }); break;

    case "licence-renewed":
      email = licenceRenewedEmail({
        businessName: "MyPoz", accentColor,
        tenantName: businessName,
        plan: String(data.plan ?? tenant.license.plan),
        newExpiry: String(data.newExpiry ?? tenant.license.expiry),
        dashboardUrl: appUrl,
      }); break;

    case "licence-expiry-warning":
      email = licenceExpiryWarningEmail({
        businessName: "MyPoz", accentColor,
        tenantName: businessName,
        plan: String(data.plan ?? tenant.license.plan),
        expiryDate: String(data.expiryDate ?? tenant.license.expiry),
        daysLeft: Number(data.daysLeft ?? 7),
        renewUrl: `${appUrl}/billing`,
      }); break;

    case "staff-invite":
      email = staffInviteEmail({
        businessName, accentColor,
        staffName: String(data.staffName ?? "Team Member"),
        email: to,
        role: String(data.role ?? "Cashier"),
        inviteUrl: String(data.inviteUrl ?? `${appUrl}/login`),
        invitedBy: String(data.invitedBy ?? "Store Owner"),
      }); break;

    case "low-stock-alert":
      email = lowStockAlertEmail({
        businessName, accentColor,
        items: (data.items as { name: string; qty: number; threshold: number }[]) ?? [{ name: "Sample Product", qty: 2, threshold: 5 }],
        dashboardUrl: appUrl,
      }); break;

    case "daily-summary":
      email = dailySummaryEmail({
        businessName, accentColor,
        date: String(data.date ?? new Date().toLocaleDateString("en-GB")),
        salesCount: Number(data.salesCount ?? 0),
        revenue: String(data.revenue ?? "Rs 0"),
        topProducts: (data.topProducts as { name: string; qty: number }[]) ?? [],
        dashboardUrl: appUrl,
      }); break;

    case "refund-confirmation":
      email = refundConfirmationEmail({
        businessName, accentColor,
        customerName: String(data.customerName ?? "Customer"),
        receiptNo: String(data.receiptNo ?? "ORD-001"),
        refundAmount: String(data.refundAmount ?? "Rs 1,000"),
        refundMethod: String(data.refundMethod ?? "Original payment method"),
        reason: data.reason as string | undefined,
      }); break;

    case "compliance-data-request":
      email = complianceDataRequestEmail({
        businessName, accentColor,
        customerName: String(data.customerName ?? "Customer"),
        email: to,
        requestType: (data.requestType as "export" | "deletion" | "correction") ?? "export",
        ticketId: String(data.ticketId ?? "GDPR-001"),
      }); break;

    case "new-tenant-welcome":
      email = newTenantWelcomeEmail({
        accentColor,
        ownerName: String(data.ownerName ?? "Owner"),
        businessName: String(data.businessName ?? businessName),
        plan: String(data.plan ?? "starter"),
        loginUrl: `${appUrl}/login`,
        storeUrl: data.storeUrl as string | undefined,
        supportEmail: "support@mypoz.lk",
        docsUrl: `${appUrl}/help`,
      }); break;

    default:
      return NextResponse.json({ success: false, error: "Unknown template" }, { status: 400 });
  }

  const result = await sendEmail({ to, subject: email.subject, html: email.html, text: email.text });

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ success: true, data: { id: result.id, configured: isEmailConfigured() }, error: null });
}

/** GET — return available templates and whether email is configured. */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      configured: isEmailConfigured(),
      templates: [
        "order-confirmation", "registration", "licence-invoice",
        "licence-renewed", "licence-expiry-warning", "staff-invite",
        "low-stock-alert", "daily-summary", "refund-confirmation",
        "compliance-data-request", "new-tenant-welcome",
      ],
    },
    error: null,
  });
}
