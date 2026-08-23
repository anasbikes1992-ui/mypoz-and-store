import { emailBase, escapeHtml, row } from "../base";

export interface MagicLinkData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  loginUrl: string;
  expiresInMinutes?: number;
}

export function magicLinkEmail(
  d: MagicLinkData,
): { html: string; subject: string; text: string } {
  const subject = `Sign in to ${d.businessName}`;
  const expires = d.expiresInMinutes ?? 60;
  const name = escapeHtml(d.customerName);

  const body = `
<h2>Your sign-in link</h2>
<p>Hi ${name}, use the button below to sign in to your account. No password needed for this session.</p>

<a class="btn" href="${escapeHtml(d.loginUrl)}">Sign in securely</a>

<table class="table"><tbody>
  ${row("Expires", `${expires} minutes`)}
</tbody></table>

<p style="font-size:13px;color:#71717a">If you did not request this link, ignore this email — your account stays secure.</p>
`;

  const text = `Sign in to ${d.businessName}: ${d.loginUrl} (expires in ${expires} min)`;

  return {
    html: emailBase({
      title: subject,
      preheader: "Your secure sign-in link",
      body,
      businessName: d.businessName,
      accentColor: d.accentColor,
    }),
    subject,
    text,
  };
}
