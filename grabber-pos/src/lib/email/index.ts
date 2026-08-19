export { sendEmail, isEmailConfigured } from "./client";
export type { SendEmailOpts, SendEmailResult } from "./client";

export { orderConfirmationEmail } from "./templates/order-confirmation";
export { orderShippedEmail } from "./templates/order-shipped";
export { registrationEmail } from "./templates/registration";
export { passwordResetEmail } from "./templates/password-reset";
export { licenceInvoiceEmail } from "./templates/licence-invoice";
export { licenceRenewedEmail } from "./templates/licence-renewed";
export { licenceExpiryWarningEmail } from "./templates/licence-expiry-warning";
export { staffInviteEmail } from "./templates/staff-invite";
export { lowStockAlertEmail } from "./templates/low-stock-alert";
export { dailySummaryEmail } from "./templates/daily-summary";
export { refundConfirmationEmail } from "./templates/refund-confirmation";
export { complianceDataRequestEmail } from "./templates/compliance-data-request";
export { newTenantWelcomeEmail } from "./templates/new-tenant-welcome";
