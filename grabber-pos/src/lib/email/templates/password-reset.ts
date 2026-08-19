import { emailBase } from "../base";

export interface PasswordResetData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function passwordResetEmail(d: PasswordResetData): { html: string; subject: string; text: string } {
  const subject = `Reset your ${d.businessName} password`;
  const expires = d.expiresInMinutes ?? 60;

  const body = `
<h2>Reset your password</h2>
<p>Hi ${d.customerName}, we received a request to reset the password for your account.</p>

<a class="btn" href="${d.resetUrl}">Reset password</a>

<p style="font-size:13px;color:#71717a">This link expires in ${expires} minutes. If you did not request a password reset, you can safely ignore this email — your password has not been changed.</p>

<div class="warn-box">
  <strong>Security tip:</strong> We will never ask for your password by email or phone. If you received this unexpectedly, contact support.
</div>
`;

  const text = `Reset your ${d.businessName} password. Click this link (expires in ${expires} min): ${d.resetUrl}`;

  return { html: emailBase({ title: subject, preheader: "Reset your password — link expires soon", body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
