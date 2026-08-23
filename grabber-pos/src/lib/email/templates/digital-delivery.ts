import { emailBase, escapeHtml } from "../base";

export interface DigitalDeliveryData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  receiptNo: string;
  total: string;
  /** Plain text body — codes, links, instructions (newlines allowed) */
  body: string;
}

export function digitalDeliveryEmail(
  d: DigitalDeliveryData,
): { html: string; subject: string; text: string } {
  const subject = `${d.businessName} · Digital delivery · ${d.receiptNo}`;
  const name = escapeHtml(d.customerName);
  const lines = d.body
    .split("\n")
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`
        : '<p style="margin:0 0 8px">&nbsp;</p>',
    )
    .join("");

  const body = `
<h2>Your digital purchase</h2>
<p>Hi ${name}, thank you for your order. Here are your digital goods / instructions:</p>

<div class="info-box">${lines}</div>

<table class="table"><tbody>
  <tr><td style="color:#71717a;width:40%">Receipt</td><td style="font-weight:500">${escapeHtml(d.receiptNo)}</td></tr>
  <tr><td style="color:#71717a">Total</td><td style="font-weight:500">${escapeHtml(d.total)}</td></tr>
</tbody></table>

<p style="font-size:13px;color:#71717a">Keep this email for your records. Contact us if anything is missing.</p>
`;

  const text = `${d.businessName} digital delivery\nReceipt: ${d.receiptNo}\nTotal: ${d.total}\n\n${d.body}`;

  return {
    html: emailBase({
      title: subject,
      preheader: `Digital delivery for order ${d.receiptNo}`,
      body,
      businessName: d.businessName,
      accentColor: d.accentColor,
    }),
    subject,
    text,
  };
}
