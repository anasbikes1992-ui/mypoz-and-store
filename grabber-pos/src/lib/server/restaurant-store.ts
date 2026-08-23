import "server-only";
import { findById } from "./product-repo";
import { recordStore } from "./persistence/record-store";

/**
 * Live restaurant orders, one open order per table, persisted server-side so a
 * cashier can move between tables/devices without losing an order. Settling an
 * order converts it into a sale (handled by the API route) and clears it here.
 *
 * The table id doubles as the record key, so two cashiers working different
 * tables never overwrite each other in the durable backend.
 */
export interface OrderLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** How many of this line have already been sent to the kitchen/bar. */
  sentQty: number;
  modifiers?: string[];
  /** Dining course (1–3). */
  course?: number;
  /** Seat / cover number. */
  seat?: number;
}

export interface Order {
  tableId: string;
  lines: OrderLine[];
  updatedAt: string;
}

/** Persisted shape — `id` is the table id. */
type OrderRecord = Order & { id: string };

const store = recordStore<OrderRecord>({
  collection: "restaurant-orders",
  file: "restaurant-orders.json",
});

function orderTotal(order: Order): number {
  return order.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

function strip(record: OrderRecord): Order {
  return { tableId: record.tableId, lines: record.lines, updatedAt: record.updatedAt };
}

export async function getOrder(tableId: string): Promise<Order | null> {
  const record = await store.get(tableId);
  return record ? strip(record) : null;
}

export async function listOpenOrders(): Promise<
  { tableId: string; total: number; items: number }[]
> {
  const orders = await store.list();
  return orders.map((o) => ({
    tableId: o.tableId,
    total: orderTotal(o),
    items: o.lines.reduce((s, l) => s + l.quantity, 0),
  }));
}

async function mutate(
  tableId: string,
  fn: (order: Order) => Order | null,
): Promise<Order | null> {
  const existing = await store.get(tableId);
  const current: Order = existing
    ? strip(existing)
    : { tableId, lines: [], updatedAt: new Date().toISOString() };

  const next = fn(current);
  if (next === null || next.lines.length === 0) {
    await store.remove(tableId);
    return null;
  }

  const saved: OrderRecord = {
    ...next,
    tableId,
    id: tableId,
    updatedAt: new Date().toISOString(),
  };
  await store.put(saved);
  return strip(saved);
}

export async function addItem(
  tableId: string,
  productId: string,
  qty = 1,
  opts?: {
    name?: string;
    modifiers?: string[];
    course?: number;
    seat?: number;
  },
): Promise<Order | null> {
  const product = findById(productId);
  if (!product) throw new Error(`Unknown product: ${productId}`);
  const displayName =
    opts?.name?.trim() ||
    (opts?.modifiers?.length
      ? `${product.name} (${opts.modifiers.join(", ")})`
      : product.name);
  const course =
    opts?.course != null && opts.course >= 1 && opts.course <= 3
      ? Math.floor(opts.course)
      : undefined;
  const seat =
    opts?.seat != null && opts.seat > 0 ? Math.floor(opts.seat) : undefined;
  return mutate(tableId, (order) => {
    const existing = order.lines.find(
      (l) =>
        l.productId === productId &&
        l.name === displayName &&
        l.course === course &&
        l.seat === seat,
    );
    const lines = existing
      ? order.lines.map((l) =>
          l.productId === productId &&
          l.name === displayName &&
          l.course === course &&
          l.seat === seat
            ? { ...l, quantity: l.quantity + qty }
            : l,
        )
      : [
          ...order.lines,
          {
            productId,
            name: displayName,
            unitPrice: product.salePrice,
            quantity: qty,
            sentQty: 0,
            modifiers: opts?.modifiers,
            course,
            seat,
          },
        ];
    return { ...order, lines };
  });
}

export async function setQty(
  tableId: string,
  productId: string,
  quantity: number,
): Promise<Order | null> {
  return mutate(tableId, (order) => ({
    ...order,
    lines:
      quantity <= 0
        ? order.lines.filter((l) => l.productId !== productId)
        : order.lines.map((l) =>
            l.productId === productId ? { ...l, quantity } : l,
          ),
  }));
}

export async function removeItem(
  tableId: string,
  productId: string,
): Promise<Order | null> {
  return mutate(tableId, (order) => ({
    ...order,
    lines: order.lines.filter((l) => l.productId !== productId),
  }));
}

/** Mark all outstanding quantities as sent; return the newly-sent lines. */
export async function markSent(
  tableId: string,
): Promise<{
  order: Order | null;
  sent: { name: string; quantity: number; course?: number; seat?: number }[];
}> {
  const sent: {
    name: string;
    quantity: number;
    course?: number;
    seat?: number;
  }[] = [];
  const order = await mutate(tableId, (o) => ({
    ...o,
    lines: o.lines.map((l) => {
      const delta = l.quantity - l.sentQty;
      if (delta > 0) {
        sent.push({
          name: l.name,
          quantity: delta,
          course: l.course,
          seat: l.seat,
        });
      }
      return { ...l, sentQty: l.quantity };
    }),
  }));
  return { order, sent };
}

export async function clearOrder(tableId: string): Promise<void> {
  await store.remove(tableId);
}

/** Remove lines for one seat and return them for partial settle. */
export async function extractSeatLines(
  tableId: string,
  seat: number,
): Promise<{ order: Order | null; lines: OrderLine[] }> {
  const extracted: OrderLine[] = [];
  const order = await mutate(tableId, (o) => {
    const keep: OrderLine[] = [];
    for (const l of o.lines) {
      if (l.seat === seat) extracted.push(l);
      else keep.push(l);
    }
    if (keep.length === 0) return null;
    return { ...o, lines: keep };
  });
  return { order, lines: extracted };
}
