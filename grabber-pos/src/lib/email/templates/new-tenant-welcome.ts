import { emailBase, row } from "../base";

export interface NewTenantWelcomeData {
  accentColor?: string;
  ownerName: string;
  businessName: string;
  plan: string;
  loginUrl: string;
  storeUrl?: string;
  supportEmail?: string;
  docsUrl?: string;
}

export function newTenantWelcomeEmail(d: NewTenantWelcomeData): { html: string; subject: string; text: string } {
  const subject = `Welcome to MyPoz — your account is ready, ${d.ownerName}`;

  const body = `
<h2>Welcome to MyPoz!</h2>
<p>Hi ${d.ownerName}, your MyPoz account for <strong>${d.businessName}</strong> has been set up. You're on the <strong>${d.plan.charAt(0).toUpperCase() + d.plan.slice(1)}</strong> plan.</p>

<table class="table"><tbody>
  ${row("Business", d.businessName)}
  ${row("Plan", d.plan.charAt(0).toUpperCase() + d.plan.slice(1))}
  ${row("Login", `<a href="${d.loginUrl}">${d.loginUrl}</a>`)}
  ${d.storeUrl ? row("Your store", `<a href="${d.storeUrl}">${d.storeUrl}</a>`) : ""}
</tbody></table>

<a class="btn" href="${d.loginUrl}">Open MyPoz</a>

<hr class="divider" />
<h2>Your first 10 minutes</h2>
<ol style="padding-left:20px;color:#3f3f46;font-size:14px;line-height:2">
  <li>Add your products (or import from CSV)</li>
  <li>Launch your online store in Commerce → Launch store</li>
  <li>Make your first POS sale</li>
  <li>Share your store URL with customers</li>
</ol>

${d.docsUrl ? `<p style="font-size:13px;color:#71717a">Need help? Read the <a href="${d.docsUrl}">getting started guide</a> or contact <a href="mailto:${d.supportEmail ?? "support@mypoz.lk"}">${d.supportEmail ?? "support@mypoz.lk"}</a>.</p>` : ""}
`;

  const text = `Welcome to MyPoz, ${d.ownerName}! Your ${d.businessName} account is ready. Login: ${d.loginUrl}`;

  return { html: emailBase({ title: subject, preheader: `${d.businessName} is live on MyPoz`, body, businessName: "MyPoz", accentColor: d.accentColor }), subject, text };
}
