import { emailBase, row } from "../base";

export interface LicenceExpiryWarningData {
  businessName: string;
  accentColor?: string;
  tenantName: string;
  plan: string;
  expiryDate: string;
  daysLeft: number;
  renewUrl?: string;
  billingEmail?: string;
}

export function licenceExpiryWarningEmail(d: LicenceExpiryWarningData): { html: string; subject: string; text: string } {
  const urgent = d.daysLeft <= 3;
  const subject = urgent
    ? `⚠️ URGENT: MyPoz licence expires in ${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"}`
    : `MyPoz licence expiring in ${d.daysLeft} days — renew now`;

  const body = `
<h2>${urgent ? "⚠️ Urgent: Licence Expiring Soon" : "Licence Renewal Reminder"}</h2>
<p>Hi ${d.tenantName}, your MyPoz ${d.plan} licence expires on <strong>${d.expiryDate}</strong> — that's <strong>${d.daysLeft} day${d.daysLeft === 1 ? "" : "s"} away</strong>.</p>

<table class="table"><tbody>
  ${row("Plan", d.plan.charAt(0).toUpperCase() + d.plan.slice(1))}
  ${row("Expires", `<strong>${d.expiryDate}</strong>`)}
  ${row("Days remaining", `<span class="badge ${d.daysLeft <= 3 ? "badge-red" : "badge-yellow"}">${d.daysLeft} days</span>`)}
</tbody></table>

<div class="${urgent ? "warn-box" : "info-box"}">
  After expiry, <strong>new sales will be blocked</strong> until the licence is renewed. Reports, settings, and historical data remain accessible.
</div>

${d.renewUrl ? `<a class="btn" href="${d.renewUrl}">Renew licence now</a>` : ""}

<p style="font-size:13px;color:#71717a">To renew, contact <a href="mailto:${d.billingEmail ?? "billing@mypoz.lk"}">${d.billingEmail ?? "billing@mypoz.lk"}</a> or visit the Billing page in your dashboard.</p>
`;

  const text = `MyPoz licence for ${d.tenantName} expires on ${d.expiryDate} (${d.daysLeft} days). Renew to keep selling.`;

  return { html: emailBase({ title: subject, preheader: `Licence expires in ${d.daysLeft} days — action required`, body, businessName: "MyPoz", accentColor: d.accentColor }), subject, text };
}
