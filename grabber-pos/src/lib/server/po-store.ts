import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { createStockDoc } from "./stock-store";
import { recordStore } from "./persistence/record-store";
import { resolveDb } from "./persistence/backend";

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data, error } = await typed
      .from("purchases")
      .select("id, reference, status, total, created_at, suppliers(name), purchase_lines(product_id, quantity, cost_price, products(name))")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      supplier: row.suppliers?.name ?? null,
      reference: row.reference ?? null,
      status: row.status,
      total: Number(row.total ?? 0),
      grnId: row.status === "received" ? row.id : null,
      createdAt: row.created_at,
      lines: (row.purchase_lines ?? []).map((line: any) => ({
        productId: line.product_id,
        name: line.products?.name ?? line.product_id,
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.cost_price ?? 0),
      })),
    }));
  }

  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createPO(input: {
  supplier?: string;
  reference?: string;
  lines: { productId: string; quantity: number; unitPrice?: number }[];
}): Promise<PurchaseOrder> {
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data: branch } = await typed
      .from("branches")
      .select("id, org_id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!branch?.id) throw new Error("No active branch for this organization");
    if (!branch.org_id) throw new Error("Branch missing organization");

    let supplierId: string | null = null;
    const supplierName = input.supplier?.trim();
    if (supplierName) {
      const { data: existingSupplier, error: supplierError } = await typed
        .from("suppliers")
        .select("id")
        .eq("name", supplierName)
        .maybeSingle();
      if (supplierError) throw new Error(supplierError.message);
      if (existingSupplier?.id) {
        supplierId = existingSupplier.id;
      }
    }

    const ids = [...new Set(input.lines.map((line) => String(line.productId)))];
    const { data: products, error: productError } = await typed
      .from("products")
      .select("id, name, cost_price")
      .in("id", ids);
    if (productError) throw new Error(productError.message);
    const productMap = new Map(
      ((products ?? []) as { id: string; name: string; cost_price: number }[]).map((row) => [
        row.id,
        row,
      ]),
    );

    const lines: POLine[] = input.lines.map((line) => {
      const product = productMap.get(String(line.productId));
      if (!product) throw new Error(`Unknown product: ${line.productId}`);
      const qty = Number(line.quantity);
      if (!(qty > 0)) throw new Error(`Invalid quantity for ${product.name}`);
      return {
        productId: product.id,
        name: product.name,
        quantity: qty,
        unitPrice: line.unitPrice != null ? Number(line.unitPrice) : Number(product.cost_price ?? 0),
      };
    });

    const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const { data: purchase, error: purchaseError } = await typed
      .from("purchases")
      .insert({
        org_id: branch.org_id,
        branch_id: branch.id,
        supplier_id: supplierId,
        reference: input.reference?.trim() || null,
        status: "draft",
        total,
      })
      .select("id, created_at")
      .single();
    if (purchaseError) throw new Error(purchaseError.message);

    const { error: lineError } = await typed.from("purchase_lines").insert(
      lines.map((line) => ({
        purchase_id: purchase.id,
        product_id: line.productId,
        quantity: line.quantity,
        cost_price: line.unitPrice,
      })),
    );
    if (lineError) throw new Error(lineError.message);

    return {
      id: purchase.id,
      supplier: supplierName || null,
      reference: input.reference?.trim() || null,
      status: "draft",
      lines,
      total,
      grnId: null,
      createdAt: purchase.created_at,
    };
  }

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { error: receiveError } = await typed.rpc("receive_purchase", {
      p_purchase: id,
    });
    if (receiveError) throw new Error(receiveError.message);
    const rows = await listPOs();
    const match = rows.find((row) => row.id === id);
    if (!match) throw new Error("Purchase order not found");
    return { ...match, status: "received", grnId: match.grnId ?? id };
  }

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
