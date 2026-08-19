import { emailBase, row } from "../base";

export interface LicenceRenewedData {
  businessName: string;
  accentColor?: string;
  tenantName: string;
  plan: string;
  newExpiry: string;
  dashboardUrl?: string;
}

export function licenceRenewedEmail(d: LicenceRenewedData): { html: string; subject: string; text: string } {
  const subject = `MyPoz licence renewed — active until ${d.newExpiry}`;

  const body = `
<h2>Licence Renewed</h2>
<p>Great news, ${d.tenantName}! Your MyPoz ${d.plan} licence has been renewed successfully.</p>

<table class="table"><tbody>
  ${row("Plan", `<strong>${d.plan.charAt(0).toUpperCase() + d.plan.slice(1)}</strong>`)}
  ${row("Active until", `<strong>${d.newExpiry}</strong>`)}
  ${row("Status", '<span class="badge badge-green">Active</span>')}
</tbody></table>

<p>Your POS terminal, online store, and all features are now active until ${d.newExpiry}.</p>

${d.dashboardUrl ? `<a class="btn" href="${d.dashboardUrl}">Open dashboard</a>` : ""}
`;

  const text = `MyPoz licence renewed. Plan: ${d.plan}. Active until: ${d.newExpiry}.`;

  return { html: emailBase({ title: subject, preheader: `Licence active until ${d.newExpiry}`, body, businessName: "MyPoz", accentColor: d.accentColor }), subject, text };
}
