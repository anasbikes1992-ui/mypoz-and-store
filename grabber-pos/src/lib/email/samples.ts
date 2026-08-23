import { passwordResetEmail } from "./templates/password-reset";
import { passwordChangedEmail } from "./templates/password-changed";
import { emailVerificationEmail } from "./templates/email-verification";
import { magicLinkEmail } from "./templates/magic-link";
import { registrationEmail } from "./templates/registration";
import { orderConfirmationEmail } from "./templates/order-confirmation";
import { orderShippedEmail } from "./templates/order-shipped";
import { refundConfirmationEmail } from "./templates/refund-confirmation";
import { staffInviteEmail } from "./templates/staff-invite";
import { newTenantWelcomeEmail } from "./templates/new-tenant-welcome";
import { licenceInvoiceEmail } from "./templates/licence-invoice";
import { licenceRenewedEmail } from "./templates/licence-renewed";
import { licenceExpiryWarningEmail } from "./templates/licence-expiry-warning";
import { lowStockAlertEmail } from "./templates/low-stock-alert";
import { dailySummaryEmail } from "./templates/daily-summary";
import { complianceDataRequestEmail } from "./templates/compliance-data-request";
import { digitalDeliveryEmail } from "./templates/digital-delivery";
import type { EmailTemplateId } from "./catalog";

export interface SampleEmailContext {
  businessName?: string;
  accentColor?: string;
  appUrl?: string;
}

export function renderSampleEmail(
  id: EmailTemplateId,
  ctx: SampleEmailContext = {},
): { html: string; subject: string; text: string } {
  const businessName = ctx.businessName ?? "Anaz Store";
  const accentColor = ctx.accentColor ?? "#c81180";
  const appUrl = ctx.appUrl ?? "https://mypoz-and-store-ui.vercel.app";

  switch (id) {
    case "password-reset":
      return passwordResetEmail({
        businessName,
        accentColor,
        customerName: "Anaz",
        resetUrl: `${appUrl}/update-password?sample=1`,
        expiresInMinutes: 60,
      });
    case "password-changed":
      return passwordChangedEmail({
        businessName,
        accentColor,
        customerName: "Anaz",
        loginUrl: `${appUrl}/login`,
      });
    case "email-verification":
      return emailVerificationEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        confirmUrl: `${appUrl}/store/anaz-store/account?verify=1`,
      });
    case "magic-link":
      return magicLinkEmail({
        businessName,
        accentColor,
        customerName: "Anaz",
        loginUrl: `${appUrl}/login?magic=1`,
      });
    case "registration":
      return registrationEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        email: "customer@example.com",
        loginUrl: `${appUrl}/store/anaz-store/account`,
      });
    case "order-confirmation":
      return orderConfirmationEmail({
        businessName,
        accentColor,
        receiptNo: "GPS-MAIN-20260823-0042",
        customerName: "Customer",
        items: [
          { name: "Kitchen scale", qty: 1, price: "Rs 4,500" },
          { name: "Delivery", qty: 1, price: "Rs 350" },
        ],
        subtotal: "Rs 4,850",
        total: "Rs 4,850",
        paymentMethod: "Cash on delivery",
        fulfilment: "courier",
        address: "Colombo 05",
        ordersUrl: `${appUrl}/commerce/orders`,
      });
    case "order-shipped":
      return orderShippedEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        receiptNo: "GPS-MAIN-20260823-0042",
        courier: "Store courier",
        trackingNumber: "TRK-8821",
        trackingUrl: `${appUrl}/store/anaz-store/account/orders`,
        estimatedDelivery: "1–2 business days",
      });
    case "refund-confirmation":
      return refundConfirmationEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        receiptNo: "GPS-MAIN-20260823-0042",
        refundAmount: "Rs 4,500",
        refundMethod: "Original payment method",
        reason: "Customer return",
      });
    case "staff-invite":
      return staffInviteEmail({
        businessName,
        accentColor,
        staffName: "Cashier",
        email: "cashier@example.com",
        role: "Cashier",
        inviteUrl: `${appUrl}/login`,
        invitedBy: "Store Owner",
      });
    case "new-tenant-welcome":
      return newTenantWelcomeEmail({
        accentColor,
        ownerName: "Owner",
        businessName,
        plan: "business",
        loginUrl: `${appUrl}/login`,
        storeUrl: `${appUrl}/store/anaz-store`,
      });
    case "licence-invoice":
      return licenceInvoiceEmail({
        businessName: "MyPoz",
        accentColor,
        tenantName: businessName,
        plan: "business",
        amountLkr: 9500,
        ticketId: "TKT-20260823",
        bankInstructions: "Bank: Commercial Bank\nAccount: MyPoz Operations\nReference: TKT-20260823",
      });
    case "licence-renewed":
      return licenceRenewedEmail({
        businessName: "MyPoz",
        accentColor,
        tenantName: businessName,
        plan: "business",
        newExpiry: "2027-12-31",
        dashboardUrl: appUrl,
      });
    case "licence-expiry-warning":
      return licenceExpiryWarningEmail({
        businessName: "MyPoz",
        accentColor,
        tenantName: businessName,
        plan: "business",
        expiryDate: "2026-09-01",
        daysLeft: 7,
        renewUrl: `${appUrl}/billing`,
      });
    case "low-stock-alert":
      return lowStockAlertEmail({
        businessName,
        accentColor,
        items: [
          { name: "Sample SKU", sku: "SKU-001", qty: 2, threshold: 5 },
          { name: "Another item", qty: 0, threshold: 3 },
        ],
        dashboardUrl: appUrl,
      });
    case "daily-summary":
      return dailySummaryEmail({
        businessName,
        accentColor,
        date: "23 Aug 2026",
        salesCount: 42,
        revenue: "Rs 128,400",
        cashAmount: "Rs 95,000",
        cardAmount: "Rs 33,400",
        onlineOrders: 6,
        topProducts: [
          { name: "Kitchen scale", qty: 8 },
          { name: "Blender", qty: 5 },
        ],
        dashboardUrl: appUrl,
      });
    case "compliance-data-request":
      return complianceDataRequestEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        email: "customer@example.com",
        requestType: "export",
        ticketId: "GDPR-20260823",
      });
    case "digital-delivery":
      return digitalDeliveryEmail({
        businessName,
        accentColor,
        customerName: "Customer",
        receiptNo: "GPS-MAIN-20260823-0099",
        total: "Rs 2,500",
        body: "Your voucher code: MPZ-DEMO-1234\nValid for 30 days.",
      });
    default:
      return passwordResetEmail({
        businessName,
        accentColor,
        customerName: "User",
        resetUrl: `${appUrl}/update-password`,
      });
  }
}
