import { emailBase, itemRow, row } from "../base";

export interface OrderConfirmationData {
  businessName: string;
  accentColor?: string;
  receiptNo: string;
  customerName: string;
  items: { name: string; qty: number; price: string }[];
  subtotal: string;
  deliveryFee?: string;
  codFee?: string;
  discount?: string;
  total: string;
  paymentMethod: string;
  fulfilment: "pickup" | "courier" | string;
  address?: string;
  storeUrl?: string;
  ordersUrl?: string;
}

export function orderConfirmationEmail(d: OrderConfirmationData): { html: string; subject: string; text: string } {
  const subject = `Order confirmed — ${d.receiptNo} | ${d.businessName}`;

  const body = `
<h2>Order Confirmed</h2>
<p>Hi ${d.customerName}, your order has been placed successfully.</p>

<table class="table">
  <thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th></tr></thead>
  <tbody>
    ${d.items.map((i) => itemRow(i.name, i.qty, i.price)).join("")}
  </tbody>
</table>

<table class="table">
  <tbody>
    ${row("Subtotal", d.subtotal)}
    ${d.deliveryFee ? row("Delivery", d.deliveryFee) : ""}
    ${d.codFee ? row("COD fee", d.codFee) : ""}
    ${d.discount ? row("Discount", `- ${d.discount}`) : ""}
    <tr><td style="font-weight:700;font-size:16px">Total</td><td style="font-weight:700;font-size:16px">${d.total}</td></tr>
  </tbody>
</table>

<hr class="divider" />
<h2>Delivery details</h2>
<table class="table"><tbody>
  ${row("Order no.", `<strong>${d.receiptNo}</strong>`)}
  ${row("Payment", d.paymentMethod)}
  ${row("Fulfilment", d.fulfilment === "pickup" ? "Click &amp; collect / pickup" : "Courier delivery")}
  ${d.address ? row("Address", d.address) : ""}
</tbody></table>

${d.fulfilment !== "pickup" ? '<div class="info-box">Your order will be dispatched within 1–2 business days. You will receive an update when it ships.</div>' : '<div class="info-box">Your order is ready for pickup. Please bring this email or your order number.</div>'}

${d.ordersUrl ? `<a class="btn" href="${d.ordersUrl}">View my orders</a>` : ""}
`;

  const text = `Order confirmed — ${d.receiptNo}\nHi ${d.customerName}, your order has been placed.\nTotal: ${d.total}\nPayment: ${d.paymentMethod}`;

  return { html: emailBase({ title: subject, preheader: `Your order ${d.receiptNo} is confirmed. Total: ${d.total}`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
