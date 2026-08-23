import { emailBase, escapeHtml, row } from "../base";

export interface EmailVerificationData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  confirmUrl: string;
  expiresInMinutes?: number;
}

export function emailVerificationEmail(
  d: EmailVerificationData,
): { html: string; subject: string; text: string } {
  const subject = `Confirm your ${d.businessName} email`;
  const expires = d.expiresInMinutes ?? 24 * 60;
  const name = escapeHtml(d.customerName);

  const body = `
<h2>Confirm your email</h2>
<p>Hi ${name}, thanks for signing up. Please confirm your email address to activate your account.</p>

<a class="btn" href="${escapeHtml(d.confirmUrl)}">Confirm email address</a>

<p style="font-size:13px;color:#71717a">This link expires in ${expires} minutes. If you did not create an account, you can ignore this email.</p>
`;

  const text = `Confirm your ${d.businessName} email: ${d.confirmUrl}`;

  return {
    html: emailBase({
      title: subject,
      preheader: "One click to confirm your email",
      body,
      businessName: d.businessName,
      accentColor: d.accentColor,
    }),
    subject,
    text,
  };
}
