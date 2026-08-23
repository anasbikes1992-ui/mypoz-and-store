/**
 * Catalog of all MyPoz transactional email templates.
 * Used by preview API and documentation.
 */

export type EmailTemplateId =
  | "password-reset"
  | "password-changed"
  | "email-verification"
  | "magic-link"
  | "registration"
  | "order-confirmation"
  | "order-shipped"
  | "refund-confirmation"
  | "staff-invite"
  | "new-tenant-welcome"
  | "licence-invoice"
  | "licence-renewed"
  | "licence-expiry-warning"
  | "low-stock-alert"
  | "daily-summary"
  | "compliance-data-request"
  | "digital-delivery";

export interface EmailTemplateMeta {
  id: EmailTemplateId;
  name: string;
  category: "auth" | "commerce" | "billing" | "ops" | "compliance";
  description: string;
  /** Typical trigger */
  trigger: string;
}

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateMeta[] = [
  {
    id: "password-reset",
    name: "Password reset",
    category: "auth",
    description: "Branded recovery link when user requests forgot password or HQ sends reset.",
    trigger: "POST /api/auth/forgot-password · HQ tenant password reset",
  },
  {
    id: "password-changed",
    name: "Password changed",
    category: "auth",
    description: "Security notice after password update.",
    trigger: "After successful /update-password",
  },
  {
    id: "email-verification",
    name: "Email verification",
    category: "auth",
    description: "Confirm email on storefront signup.",
    trigger: "Storefront customer registration",
  },
  {
    id: "magic-link",
    name: "Magic sign-in link",
    category: "auth",
    description: "Passwordless one-click login.",
    trigger: "Optional magic-link auth",
  },
  {
    id: "registration",
    name: "Welcome / registration",
    category: "commerce",
    description: "New customer account on the online store.",
    trigger: "Storefront signup",
  },
  {
    id: "order-confirmation",
    name: "Order confirmation",
    category: "commerce",
    description: "Receipt summary after checkout.",
    trigger: "Online order placed",
  },
  {
    id: "order-shipped",
    name: "Order shipped",
    category: "commerce",
    description: "Dispatch notice with tracking.",
    trigger: "Delivery status → out / shipped",
  },
  {
    id: "refund-confirmation",
    name: "Refund confirmation",
    category: "commerce",
    description: "Refund processed for a return.",
    trigger: "Return / refund completed",
  },
  {
    id: "digital-delivery",
    name: "Digital delivery",
    category: "commerce",
    description: "Codes, vouchers, or digital goods after sale.",
    trigger: "Digital mode sale complete",
  },
  {
    id: "staff-invite",
    name: "Staff invite",
    category: "ops",
    description: "Invite cashier/manager to join the shop.",
    trigger: "Permissions → invite staff",
  },
  {
    id: "new-tenant-welcome",
    name: "New tenant welcome",
    category: "ops",
    description: "HQ onboard — first steps for a new client.",
    trigger: "After hq_provision_tenant",
  },
  {
    id: "low-stock-alert",
    name: "Low stock alert",
    category: "ops",
    description: "Products below threshold.",
    trigger: "Scheduled / alerts job",
  },
  {
    id: "daily-summary",
    name: "Daily sales summary",
    category: "ops",
    description: "End-of-day revenue snapshot for owners.",
    trigger: "Scheduled digest",
  },
  {
    id: "licence-invoice",
    name: "Licence invoice",
    category: "billing",
    description: "Plan renewal payment request.",
    trigger: "Billing → request payment",
  },
  {
    id: "licence-renewed",
    name: "Licence renewed",
    category: "billing",
    description: "Confirmation after payment applied.",
    trigger: "HQ extends licence",
  },
  {
    id: "licence-expiry-warning",
    name: "Licence expiry warning",
    category: "billing",
    description: "Reminder before plan expires.",
    trigger: "Licence cron / manual",
  },
  {
    id: "compliance-data-request",
    name: "Data request (GDPR)",
    category: "compliance",
    description: "Acknowledgement of export/deletion/correction request.",
    trigger: "Privacy request form",
  },
];

export const EMAIL_TEMPLATE_IDS = EMAIL_TEMPLATE_CATALOG.map((t) => t.id);
