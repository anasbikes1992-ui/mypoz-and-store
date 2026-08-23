import { emailBase, escapeHtml } from "../base";

export interface PasswordChangedData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  loginUrl?: string;
  changedAt?: string;
}

export function passwordChangedEmail(
  d: PasswordChangedData,
): { html: string; subject: string; text: string } {
  const subject = `Your ${d.businessName} password was changed`;
  const name = escapeHtml(d.customerName);
  const when = d.changedAt
    ? escapeHtml(d.changedAt)
    : new Date().toLocaleString("en-LK", { timeZone: "Asia/Colombo" });

  const body = `
<h2>Password updated</h2>
<p>Hi ${name}, your account password was changed successfully on <strong>${when}</strong>.</p>

<div class="info-box">
  If you made this change, no further action is needed. You can sign in with your new password.
</div>

<div class="warn-box">
  <strong>Didn't change your password?</strong> Contact support immediately — someone may have access to your account.
</div>

${d.loginUrl ? `<a class="btn" href="${escapeHtml(d.loginUrl)}">Sign in</a>` : ""}
`;

  const text = `Your ${d.businessName} password was changed on ${when}. If this wasn't you, contact support.`;

  return {
    html: emailBase({
      title: subject,
      preheader: "Your password was updated",
      body,
      businessName: d.businessName,
      accentColor: d.accentColor,
    }),
    subject,
    text,
  };
}
