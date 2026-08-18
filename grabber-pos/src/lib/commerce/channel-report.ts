import type { Sale } from "@/lib/types";

export type ChannelRow = { source: string; count: number; revenue: number };

/** Group completed sales by POS / ONLINE_STORE / WHATSAPP — same ledger, not a warehouse. */
export function salesByChannel(sales: Sale[]): ChannelRow[] {
  const map = new Map<string, ChannelRow>();
  for (const s of sales) {
    if ((s.status ?? "completed") === "voided") continue;
    const source = s.source ?? "POS";
    const row = map.get(source) ?? { source, count: 0, revenue: 0 };
    row.count += 1;
    row.revenue += Number(s.total) || 0;
    map.set(source, row);
  }
  const order = ["POS", "ONLINE_STORE", "WHATSAPP", "PHONE", "OTHER"];
  return [...map.values()].sort(
    (a, b) => order.indexOf(a.source) - order.indexOf(b.source) || b.revenue - a.revenue,
  );
}
