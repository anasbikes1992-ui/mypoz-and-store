import { mobilesMatch } from "@/lib/commerce/customer-mobile";
import type { Sale } from "@/lib/types";

export type CustomerChannelSource = NonNullable<Sale["source"]> | "UNKNOWN";

export interface CustomerChannelSummary {
  source: CustomerChannelSource;
  orderCount: number;
  revenue: number;
}

export interface CustomerProfileSale {
  id: string;
  receiptNo?: string;
  total: number;
  source?: Sale["source"];
  status?: Sale["status"];
  createdAt: string;
  paymentMethod: string;
}

export interface CustomerTimelineItem {
  id: string;
  type: "sale" | "loyalty";
  at: string;
  title: string;
  subtitle?: string;
  amount?: number;
  points?: number;
}

export interface LoyaltyTimelineEntry {
  id: string;
  kind: string;
  points: number;
  note: string;
  saleId?: string;
  createdAt: string;
}

const CHANNEL_LABEL: Record<CustomerChannelSource, string> = {
  POS: "In-store POS",
  ONLINE_STORE: "Online store",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  OTHER: "Other",
  UNKNOWN: "Unknown",
};

export function channelLabel(source: CustomerChannelSource): string {
  return CHANNEL_LABEL[source] ?? source;
}

export function filterSalesForCustomer(
  sales: Sale[],
  mobile: string,
): Sale[] {
  const key = mobile.trim();
  if (!key) return [];
  return sales.filter((s) => mobilesMatch(s.customerMobile, key));
}

export function aggregateChannels(sales: Sale[]): CustomerChannelSummary[] {
  const map = new Map<CustomerChannelSource, CustomerChannelSummary>();
  for (const sale of sales) {
    if (sale.status === "voided") continue;
    const source: CustomerChannelSource = sale.source ?? "POS";
    const row = map.get(source) ?? { source, orderCount: 0, revenue: 0 };
    row.orderCount += 1;
    row.revenue += sale.total;
    map.set(source, row);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

export function buildCustomerTimeline(
  sales: CustomerProfileSale[],
  entries: LoyaltyTimelineEntry[],
): CustomerTimelineItem[] {
  const items: CustomerTimelineItem[] = [];

  for (const sale of sales) {
    const label = sale.receiptNo || sale.id.slice(0, 8);
    const src = sale.source ? channelLabel(sale.source) : "Sale";
    items.push({
      id: `sale-${sale.id}`,
      type: "sale",
      at: sale.createdAt,
      title: `${src} · ${label}`,
      subtitle: sale.status === "voided" ? "Voided" : sale.paymentMethod,
      amount: sale.total,
    });
  }

  for (const entry of entries) {
    const pointsDelta =
      entry.kind === "adjust"
        ? entry.points
        : entry.kind === "redeem" || entry.kind === "expire"
          ? -entry.points
          : entry.points;
    items.push({
      id: `loyalty-${entry.id}`,
      type: "loyalty",
      at: entry.createdAt,
      title: `Loyalty ${entry.kind}`,
      subtitle: entry.note || entry.saleId || undefined,
      points: pointsDelta,
    });
  }

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 60);
}

export function toProfileSale(sale: Sale): CustomerProfileSale {
  return {
    id: sale.id,
    receiptNo: sale.receiptNo,
    total: sale.total,
    source: sale.source,
    status: sale.status,
    createdAt: sale.createdAt,
    paymentMethod: sale.paymentMethod,
  };
}
