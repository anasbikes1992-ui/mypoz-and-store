import "server-only";
import { recordStore } from "./persistence/record-store";

export type CommerceEventType =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "checkout_started"
  | "purchase";

export interface CommerceEvent {
  id: string;
  type: CommerceEventType;
  slug: string;
  path: string;
  productId?: string;
  value?: number;
  createdAt: string;
}

const store = recordStore<CommerceEvent>({
  collection: "commerce-events",
  file: "commerce-events.json",
});

export async function trackCommerceEvent(
  event: Omit<CommerceEvent, "id" | "createdAt"> & { id?: string; createdAt?: string },
): Promise<CommerceEvent> {
  const row: CommerceEvent = {
    ...event,
    id: event.id ?? `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
    path: String(event.path || "/").slice(0, 200),
  };
  return store.put(row);
}

export async function listCommerceEvents(slug?: string): Promise<CommerceEvent[]> {
  const all = await store.list();
  const filtered = slug ? all.filter((e) => e.slug === slug) : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function summarizeFunnel(events: CommerceEvent[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todays = events.filter((e) => e.createdAt.slice(0, 10) === today);
  const count = (type: CommerceEventType, list = events) =>
    list.filter((e) => e.type === type).length;
  const revenue = events
    .filter((e) => e.type === "purchase")
    .reduce((s, e) => s + (e.value ?? 0), 0);
  const purchases = count("purchase");
  const visitors = count("page_view");
  return {
    visitors,
    productViews: count("product_view"),
    addToCart: count("add_to_cart"),
    checkoutStarted: count("checkout_started"),
    purchases,
    conversionRate: visitors > 0 ? purchases / visitors : 0,
    revenue,
    averageOrderValue: purchases > 0 ? revenue / purchases : 0,
    todayVisitors: count("page_view", todays),
    todayPurchases: count("purchase", todays),
    todayRevenue: todays
      .filter((e) => e.type === "purchase")
      .reduce((s, e) => s + (e.value ?? 0), 0),
  };
}
