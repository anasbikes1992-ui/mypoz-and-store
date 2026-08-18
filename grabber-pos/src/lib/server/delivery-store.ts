import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { recordStore } from "./persistence/record-store";

/**
 * Delivery orders — customer + address + driver + status, with the same
 * item/send engine as restaurant orders. Settling converts to a sale.
 */
export type DeliveryStatus = "new" | "preparing" | "out" | "delivered";

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

/** Create a filled delivery board row from a public storefront checkout. */
export async function createOrderFromStorefront(input: {
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
}): Promise<DeliveryOrder> {
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
  meta: Partial<Pick<DeliveryOrder, "customer" | "phone" | "address" | "driver" | "status">>,
): Promise<DeliveryOrder | null> {
  return mutate(id, (o) => ({ ...o, ...meta }));
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
