import { emailBase, row } from "../base";

export interface OrderShippedData {
  businessName: string;
  accentColor?: string;
  customerName: string;
  receiptNo: string;
  trackingNumber?: string;
  trackingUrl?: string;
  courier?: string;
  estimatedDelivery?: string;
  storeUrl?: string;
}

export function orderShippedEmail(d: OrderShippedData): { html: string; subject: string; text: string } {
  const subject = `Your order ${d.receiptNo} has been shipped — ${d.businessName}`;

  const body = `
<h2>Your order is on its way 🚚</h2>
<p>Hi ${d.customerName}, great news — your order has been dispatched.</p>

<table class="table"><tbody>
  ${row("Order no.", `<strong>${d.receiptNo}</strong>`)}
  ${d.courier ? row("Courier", d.courier) : ""}
  ${d.trackingNumber ? row("Tracking no.", d.trackingNumber) : ""}
  ${d.estimatedDelivery ? row("Estimated delivery", d.estimatedDelivery) : ""}
</tbody></table>

${d.trackingUrl ? `<a class="btn" href="${d.trackingUrl}">Track my parcel</a>` : ""}

<p style="font-size:13px;color:#71717a">If you have any questions about your delivery, reply to this email or contact us.</p>
`;

  const text = `Your order ${d.receiptNo} has shipped. ${d.trackingNumber ? `Tracking: ${d.trackingNumber}` : ""}`;

  return { html: emailBase({ title: subject, preheader: `Order ${d.receiptNo} dispatched`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
