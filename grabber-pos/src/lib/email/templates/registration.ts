import { emailBase, row } from "../base";

export interface RegistrationData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  email: string;
  storeUrl?: string;
  loginUrl?: string;
}

export function registrationEmail(d: RegistrationData): { html: string; subject: string; text: string } {
  const subject = `Welcome to ${d.businessName}!`;

  const body = `
<h2>Welcome, ${d.customerName}!</h2>
<p>Your account has been created successfully. You can now shop online, track your orders, and manage your order history.</p>

<table class="table"><tbody>
  ${row("Name", d.customerName)}
  ${row("Email", d.email)}
</tbody></table>

${d.loginUrl ? `<a class="btn" href="${d.loginUrl}">Sign in to your account</a>` : ""}

<hr class="divider" />
<p style="font-size:13px;color:#71717a">If you did not create this account, please ignore this email or contact support.</p>
`;

  const text = `Welcome to ${d.businessName}, ${d.customerName}! Your account has been created with email: ${d.email}`;

  return { html: emailBase({ title: subject, preheader: `Your ${d.businessName} account is ready`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
