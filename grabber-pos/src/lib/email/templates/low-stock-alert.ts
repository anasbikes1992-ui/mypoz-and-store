import { emailBase } from "../base";

export interface LowStockItem {
  name: string;
  sku?: string;
  qty: number;
  threshold: number;
}

export interface LowStockAlertData {
  businessName: string;
  accentColor?: string;
  items: LowStockItem[];
  dashboardUrl?: string;
}

export function lowStockAlertEmail(d: LowStockAlertData): { html: string; subject: string; text: string } {
  const subject = `Low stock alert — ${d.items.length} product${d.items.length === 1 ? "" : "s"} need restocking`;

  const rows = d.items.map((i) =>
    `<tr>
      <td>${i.name}${i.sku ? ` <span style="color:#71717a;font-size:12px">(${i.sku})</span>` : ""}</td>
      <td style="text-align:center"><span class="badge ${i.qty === 0 ? "badge-red" : "badge-yellow"}">${i.qty} left</span></td>
      <td style="text-align:center;color:#71717a">${i.threshold}</td>
    </tr>`,
  ).join("");

  const body = `
<h2>Low Stock Alert</h2>
<p>The following products at <strong>${d.businessName}</strong> are running low and need restocking.</p>

<table class="table">
  <thead><tr><th>Product</th><th style="text-align:center">In stock</th><th style="text-align:center">Threshold</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

${d.dashboardUrl ? `<a class="btn" href="${d.dashboardUrl}/inventory">Manage inventory</a>` : ""}
`;

  const text = `Low stock alert: ${d.items.map((i) => `${i.name} (${i.qty} left)`).join(", ")}`;

  return { html: emailBase({ title: subject, preheader: `${d.items.length} products need restocking`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
