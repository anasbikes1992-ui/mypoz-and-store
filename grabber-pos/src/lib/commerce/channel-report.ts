import type { Sale } from "@/lib/types";

export type ChannelRow = { source: string; count: number; revenue: number };

export type TodayChannelSnapshot = {
  pos: number;
  web: number;
  whatsapp: number;
  total: number;
  revenue: number;
};

const CHANNEL_ORDER = ["POS", "ONLINE_STORE", "WHATSAPP", "PHONE", "OTHER"];

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
  return [...map.values()].sort(
    (a, b) =>
      CHANNEL_ORDER.indexOf(a.source) - CHANNEL_ORDER.indexOf(b.source) ||
      b.revenue - a.revenue,
  );
}

/** Calendar day in a shop timezone (default Asia/Colombo). */
export function isSaleOnLocalDay(
  createdAt: string,
  timeZone = "Asia/Colombo",
  now = new Date(),
): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const saleDay = fmt.format(new Date(createdAt));
  const today = fmt.format(now);
  return saleDay === today;
}

/**
 * Thin owner strip: TODAY counts by channel from the canonical sales ledger.
 * No separate warehouse — same `source` field as create_sale.
 */
export function todayChannelSnapshot(
  sales: Sale[],
  opts?: { timeZone?: string; now?: Date },
): TodayChannelSnapshot {
  const timeZone = opts?.timeZone ?? "Asia/Colombo";
  const now = opts?.now ?? new Date();
  const today = sales.filter(
    (s) =>
      (s.status ?? "completed") !== "voided" &&
      isSaleOnLocalDay(s.createdAt, timeZone, now),
  );
  const by = salesByChannel(today);
  const count = (source: string) =>
    by.find((r) => r.source === source)?.count ?? 0;
  const revenue = by.reduce((sum, r) => sum + r.revenue, 0);
  const pos = count("POS");
  const web = count("ONLINE_STORE");
  const whatsapp = count("WHATSAPP");
  return {
    pos,
    web,
    whatsapp,
    total: pos + web + whatsapp + count("PHONE") + count("OTHER"),
    revenue,
  };
}
