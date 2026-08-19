import { emailBase, row } from "../base";

export interface LicenceInvoiceData {
  businessName: string;
  accentColor?: string;
  tenantName: string;
  plan: string;
  amountLkr: number;
  ticketId: string;
  bankInstructions: string;
  billingEmail?: string;
}

export function licenceInvoiceEmail(d: LicenceInvoiceData): { html: string; subject: string; text: string } {
  const amount = `Rs ${d.amountLkr.toLocaleString("en-LK")}`;
  const subject = `MyPoz ${d.plan} plan invoice — ${amount}`;

  const body = `
<h2>Licence Invoice</h2>
<p>Hi ${d.tenantName}, here is your invoice for the MyPoz ${d.plan} plan.</p>

<table class="table"><tbody>
  ${row("Plan", `<strong>${d.plan.charAt(0).toUpperCase() + d.plan.slice(1)}</strong>`)}
  ${row("Amount", `<strong>${amount} / month</strong>`)}
  ${row("Ticket ref.", d.ticketId)}
</tbody></table>

<hr class="divider" />
<h2>Payment instructions</h2>
<div class="info-box">${d.bankInstructions.replace(/\n/g, "<br/>")}</div>

<p>Once payment is confirmed, your licence will be extended by 30 days. Please reply to this email with your bank slip or payment confirmation.</p>

<p style="font-size:13px;color:#71717a">Your POS and storefront will continue to operate until your current licence expires. Contact <a href="mailto:${d.billingEmail ?? "billing@mypoz.lk"}">${d.billingEmail ?? "billing@mypoz.lk"}</a> for any billing queries.</p>
`;

  const text = `MyPoz ${d.plan} invoice — ${amount}. Ticket: ${d.ticketId}. ${d.bankInstructions}`;

  return { html: emailBase({ title: subject, preheader: `${amount} due for MyPoz ${d.plan} plan`, body, businessName: "MyPoz", accentColor: d.accentColor }), subject, text };
}
