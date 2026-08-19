import { emailBase, row } from "../base";

export interface DailySummaryData {
  businessName: string;
  accentColor?: string;
  date: string;
  salesCount: number;
  revenue: string;
  topProducts: { name: string; qty: number }[];
  cashAmount?: string;
  cardAmount?: string;
  onlineOrders?: number;
  dashboardUrl?: string;
}

export function dailySummaryEmail(d: DailySummaryData): { html: string; subject: string; text: string } {
  const subject = `Daily summary — ${d.businessName} — ${d.date}`;

  const body = `
<h2>Daily Sales Summary</h2>
<p>Here is your sales summary for <strong>${d.date}</strong>.</p>

<table class="table"><tbody>
  ${row("Total sales", `<strong>${d.salesCount} transactions</strong>`)}
  ${row("Revenue", `<strong style="font-size:18px">${d.revenue}</strong>`)}
  ${d.cashAmount ? row("Cash", d.cashAmount) : ""}
  ${d.cardAmount ? row("Card", d.cardAmount) : ""}
  ${d.onlineOrders !== undefined ? row("Online orders", String(d.onlineOrders)) : ""}
</tbody></table>

${d.topProducts.length > 0 ? `
<h2>Top products today</h2>
<table class="table">
  <thead><tr><th>Product</th><th style="text-align:right">Qty sold</th></tr></thead>
  <tbody>
    ${d.topProducts.map((p) => `<tr><td>${p.name}</td><td style="text-align:right">${p.qty}</td></tr>`).join("")}
  </tbody>
</table>` : ""}

${d.dashboardUrl ? `<a class="btn" href="${d.dashboardUrl}/reports">Full report</a>` : ""}
`;

  const text = `Daily summary ${d.date}: ${d.salesCount} sales, ${d.revenue} revenue.`;

  return { html: emailBase({ title: subject, preheader: `${d.salesCount} sales · ${d.revenue} today`, body, businessName: d.businessName, accentColor: d.accentColor }), subject, text };
}
