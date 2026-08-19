import { emailBase, row } from "../base";

export interface RefundConfirmationData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  receiptNo: string;
  refundAmount: string;
  refundMethod: string;
  reason?: string;
  processingDays?: number;
}

export function refundConfirmationEmail(d: RefundConfirmationData): { html: string; subject: string; text: string } {
  const subject = `Refund processed — ${d.receiptNo} | ${d.businessName}`;

  const body = `
<h2>Refund Confirmation</h2>
<p>Hi ${d.customerName}, your refund has been processed.</p>

<table class="table"><tbody>
  ${row("Order no.", `<strong>${d.receiptNo}</strong>`)}
  ${row("Refund amount", `<strong>${d.refundAmount}</strong>`)}
  ${row("Refund to", d.refundMethod)}
  ${d.reason ? row("Reason", d.reason) : ""}
</tbody></table>

<div class="info-box">
  ${d.processingDays ? `Please allow <strong>${d.processingDays} business days</strong> for the refund to appear in your account.` : "Your refund will be processed shortly."}
</div>

<p style="font-size:13px;color:#71717a">If you have any questions, please reply to this email.</p>
`;

  const text = `Refund of ${d.refundAmount} processed for order ${d.receiptNo}.`;

  return { html: emailBase({ title: subject, preheader: `Refund of ${d.refundAmount} processed`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
