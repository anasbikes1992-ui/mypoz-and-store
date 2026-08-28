import "server-only";
import {
  aggregateChannels,
  buildCustomerTimeline,
  filterSalesForCustomer,
  toProfileSale,
  type CustomerChannelSummary,
  type CustomerProfileSale,
  type CustomerTimelineItem,
} from "@/lib/commerce/customer-profile-aggregate";
import { getEntity } from "@/lib/server/collection-store";
import {
  listByCustomer,
  type LoyaltyLedgerEntry,
} from "@/lib/server/loyalty-ledger";
import { getRepository } from "@/lib/server/repositories";

export type {
  CustomerChannelSource,
  CustomerChannelSummary,
  CustomerProfileSale,
  CustomerTimelineItem,
} from "@/lib/commerce/customer-profile-aggregate";
export {
  aggregateChannels,
  buildCustomerTimeline,
  channelLabel,
  filterSalesForCustomer,
} from "@/lib/commerce/customer-profile-aggregate";

export interface CustomerProfile {
  customer: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    points: number;
    creditLimit: number;
    priceTier: string;
    address: string;
  };
  stats: {
    orderCount: number;
    lifetimeSpend: number;
    lastOrderAt: string | null;
    avgOrderValue: number;
  };
  channels: CustomerChannelSummary[];
  recentSales: CustomerProfileSale[];
  loyalty: {
    points: number;
    entries: LoyaltyLedgerEntry[];
  };
  timeline: CustomerTimelineItem[];
}

export async function buildCustomerProfile(
  customerId: string,
): Promise<CustomerProfile | null> {
  const row = await getEntity("customers", customerId);
  if (!row) return null;

  const mobile = String(row.mobile ?? "").trim();
  const repo = await getRepository();
  const allSales = await repo.listSales(500);
  const matched = filterSalesForCustomer(allSales, mobile);
  const completed = matched.filter((s) => s.status !== "voided");
  const recentSales = matched
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25)
    .map(toProfileSale);

  const lifetimeSpend = completed.reduce((sum, s) => sum + s.total, 0);
  const orderCount = completed.length;
  const lastOrderAt =
    completed.length > 0
      ? completed.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          .createdAt
      : null;

  const points = Number(row.points) || 0;
  const entries = await listByCustomer(customerId, 50);

  return {
    customer: {
      id: customerId,
      name: String(row.name ?? ""),
      mobile,
      email: String(row.email ?? ""),
      points,
      creditLimit: Number(row.creditLimit) || 0,
      priceTier: String(row.priceTier ?? "retail"),
      address: String(row.address ?? ""),
    },
    stats: {
      orderCount,
      lifetimeSpend,
      lastOrderAt,
      avgOrderValue: orderCount > 0 ? lifetimeSpend / orderCount : 0,
    },
    channels: aggregateChannels(matched),
    recentSales,
    loyalty: { points, entries },
    timeline: buildCustomerTimeline(recentSales, entries),
  };
}
