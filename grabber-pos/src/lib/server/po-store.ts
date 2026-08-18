import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { createStockDoc } from "./stock-store";
import { recordStore } from "./persistence/record-store";

/**
 * Purchase orders (draft → received). Receiving a PO applies the stock via the
 * shared GRN engine and links the resulting Goods Received Note back to the PO.
 */
export interface POLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  supplier: string | null;
  reference: string | null;
  status: "draft" | "received" | "cancelled";
  lines: POLine[];
  total: number;
  grnId: string | null;
  createdAt: string;
}

const store = recordStore<PurchaseOrder>({
  collection: "purchase-orders",
  file: "purchase-orders.json",
});

export async function listPOs(): Promise<PurchaseOrder[]> {
  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createPO(input: {
  supplier?: string;
  reference?: string;
  lines: { productId: string; quantity: number; unitPrice?: number }[];
}): Promise<PurchaseOrder> {
  if (!input.lines?.length) throw new Error("Add at least one line");
  const lines: POLine[] = [];
  for (const l of input.lines) {
    const product = findById(l.productId);
    if (!product) throw new Error(`Unknown product: ${l.productId}`);
    const qty = Number(l.quantity);
    if (!(qty > 0)) throw new Error(`Invalid quantity for ${product.name}`);
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: qty,
      unitPrice: l.unitPrice != null ? Number(l.unitPrice) : product.costPrice,
    });
  }
  const po: PurchaseOrder = {
    id: "PO-" + randomUUID().slice(0, 8),
    supplier: input.supplier?.trim() || null,
    reference: input.reference?.trim() || null,
    status: "draft",
    lines,
    total: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    grnId: null,
    createdAt: new Date().toISOString(),
  };
  return store.put(po);
}

export async function receivePO(id: string): Promise<PurchaseOrder> {
  const po = await store.get(id);
  if (!po) throw new Error("Purchase order not found");
  if (po.status !== "draft") throw new Error("Only draft orders can be received");

  // Apply stock via the shared GRN engine.
  const grn = await createStockDoc("grn", {
    party: po.supplier ?? undefined,
    reference: po.id,
    lines: po.lines.map((l) => ({
      productId: l.productId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
    })),
  });

  const received: PurchaseOrder = {
    ...po,
    status: "received",
    grnId: grn.id,
  };
  return store.put(received);
}
