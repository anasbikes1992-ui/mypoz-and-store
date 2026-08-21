import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { recordStore } from "./persistence/record-store";
import {
  findStorefrontOrderBySaleOrReceipt,
  updateStorefrontWebOrder,
} from "./storefront-orders-store";
import { createServiceSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Delivery orders — customer + address + driver + status, with the same
 * item/send engine as restaurant orders. Settling converts to a sale
 * (manual) or marks the existing storefront sale delivered (no re-sale).
 */
export type DeliveryStatus = "new" | "preparing" | "out" | "delivered";

export const DELIVERY_STATUSES = [
  "new",
  "preparing",
  "out",
  "delivered",
] as const satisfies readonly DeliveryStatus[];

export interface DeliveryLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sentQty: number;
}

export interface DeliveryOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  driver: string;
  status: DeliveryStatus;
  lines: DeliveryLine[];
  /** courier | pickme | uber — set for storefront web orders. */
  fulfilment?: string;
  note?: string;
  source?: "manual" | "storefront";
  saleId?: string | null;
  receiptNo?: string | null;
  /** Set when storefront COD was collected on settle (no second sale). */
  codCollectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const store = recordStore<DeliveryOrder>({
  collection: "delivery-orders",
  file: "delivery-orders.json",
});

export function orderTotal(o: DeliveryOrder): number {
  return o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

/** Require sequential forward: new → preparing → out → delivered. */
export function assertDeliveryStatusTransition(
  from: DeliveryStatus,
  to: DeliveryStatus,
): void {
  if (from === to) return;
  const fi = DELIVERY_STATUSES.indexOf(from);
  const ti = DELIVERY_STATUSES.indexOf(to);
  if (fi < 0 || ti < 0) {
    throw new Error(`Invalid delivery status: ${from} → ${to}`);
  }
  if (ti !== fi + 1) {
    const next = DELIVERY_STATUSES[fi + 1];
    throw new Error(
      next
        ? `Invalid status transition: ${from} → ${to}. Next allowed: ${next}`
        : `Order is already ${from}`,
    );
  }
}

export async function listActive(): Promise<DeliveryOrder[]> {
  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getOrder(id: string): Promise<DeliveryOrder | null> {
  return store.get(id);
}

export async function createOrder(): Promise<DeliveryOrder> {
  const order: DeliveryOrder = {
    id: "DEL-" + randomUUID().slice(0, 8),
    customer: "",
    phone: "",
    address: "",
    driver: "",
    status: "new",
    lines: [],
    source: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return store.put(order);
}

export async function createOrderFromStorefront(
  input: {
    customer: string;
    phone: string;
    address: string;
    note?: string;
    fulfilment?: string;
    lines: {
      productId: string;
      name: string;
      unitPrice: number;
      quantity: number;
    }[];
    saleId?: string | null;
    receiptNo?: string | null;
  },
  /** When set (anonymous storefront), persist via service role — no session RLS. */
  orgId?: string,
): Promise<DeliveryOrder> {
  const order: DeliveryOrder = {
    id: "DEL-" + randomUUID().slice(0, 8).toUpperCase(),
    customer: input.customer.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    driver: "",
    status: "new",
    lines: input.lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      sentQty: 0,
    })),
    fulfilment: input.fulfilment,
    note: input.note ?? "",
    source: "storefront",
    saleId: input.saleId ?? null,
    receiptNo: input.receiptNo ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (orgId) {
    const db = createServiceSupabase();
    const { error } = await db.from("app_collections").upsert(
      {
        org_id: orgId,
        collection: "delivery-orders",
        entity_id: order.id,
        data: order as unknown as Json,
      },
      { onConflict: "org_id,collection,entity_id" },
    );
    if (error) throw new Error(error.message);
    return order;
  }
  return store.put(order);
}

async function mutate(
  id: string,
  fn: (o: DeliveryOrder) => DeliveryOrder,
): Promise<DeliveryOrder | null> {
  const current = await store.get(id);
  if (!current) return null;
  return store.put({ ...fn(current), updatedAt: new Date().toISOString() });
}

export async function updateMeta(
  id: string,
  meta: Partial<
    Pick<DeliveryOrder, "customer" | "phone" | "address" | "driver" | "status">
  >,
): Promise<DeliveryOrder | null> {
  return mutate(id, (o) => {
    if (meta.status !== undefined && meta.status !== o.status) {
      assertDeliveryStatusTransition(o.status, meta.status);
    }
    return { ...o, ...meta };
  });
}

export async function addItem(
  id: string,
  productId: string,
  qty = 1,
): Promise<DeliveryOrder | null> {
  const product = findById(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  return mutate(id, (o) => {
    const existing = o.lines.find((l) => l.productId === productId);
    const lines = existing
      ? o.lines.map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity + qty } : l,
        )
      : [
          ...o.lines,
          {
            productId,
            name: product.name,
            unitPrice: product.salePrice,
            quantity: qty,
            sentQty: 0,
          },
        ];
    return { ...o, lines };
  });
}

export async function setQty(
  id: string,
  productId: string,
  quantity: number,
): Promise<DeliveryOrder | null> {
  return mutate(id, (o) => ({
    ...o,
    lines:
      quantity <= 0
        ? o.lines.filter((l) => l.productId !== productId)
        : o.lines.map((l) =>
            l.productId === productId ? { ...l, quantity } : l,
          ),
  }));
}

export async function markSent(
  id: string,
): Promise<{ order: DeliveryOrder | null; sent: { name: string; quantity: number }[] }> {
  const sent: { name: string; quantity: number }[] = [];
  const order = await mutate(id, (o) => ({
    ...o,
    lines: o.lines.map((l) => {
      const delta = l.quantity - l.sentQty;
      if (delta > 0) sent.push({ name: l.name, quantity: delta });
      return { ...l, sentQty: l.quantity };
    }),
  }));
  return { order, sent };
}

export async function removeOrder(id: string): Promise<void> {
  await store.remove(id);
}

export function isStorefrontLinked(order: DeliveryOrder): boolean {
  return order.source === "storefront" && Boolean(order.saleId);
}

/**
 * Mark storefront delivery delivered + COD collected without creating another sale
 * (stock already decremented by storefront_create_order).
 */
export async function settleStorefrontDelivery(id: string): Promise<{
  id: string;
  receiptNo: string | null;
  saleId: string;
  total: number;
  status: "delivered";
  codCollected: true;
}> {
  const order = await getOrder(id);
  if (!order) throw new Error("Order not found");
  if (!isStorefrontLinked(order)) {
    throw new Error("Not a storefront-linked delivery order");
  }
  if (order.lines.length === 0) throw new Error("Empty order");

  const saleId = String(order.saleId);
  const now = new Date().toISOString();

  const updated = await mutate(id, (o) => ({
    ...o,
    status: "delivered" as const,
    codCollectedAt: now,
  }));
  if (!updated) throw new Error("Order not found");

  const web = await findStorefrontOrderBySaleOrReceipt(
    saleId,
    order.receiptNo ?? undefined,
  );
  if (web) {
    await updateStorefrontWebOrder(web.id, {
      fulfillmentStatus: "delivered",
    });
  }

  const total = orderTotal(updated);
  await removeOrder(id);

  return {
    id: saleId,
    receiptNo: order.receiptNo ?? web?.receiptNo ?? null,
    saleId,
    total,
    status: "delivered",
    codCollected: true,
  };
}
