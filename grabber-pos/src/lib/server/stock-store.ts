import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { upsertOverride } from "./product-write-store";
import { resolveDb } from "./persistence/backend";
import { dataFile, readJsonFile, writeJsonFile } from "./persistence/local-json";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Stock operations: goods received (GRN), customer returns (restock) and
 * damages (write-off). Each applies a signed quantity change to the product and
 * records an append-only movement.
 *
 * Unlike the other module stores this is not a document blob, so it does not use
 * the record-store seam:
 *  - Local backend  — product quantities live in the writable override map and
 *    movements append to data/stock-movements.json.
 *  - Durable backend — the header lands in `stock_documents` and each line goes
 *    through the `adjust_stock` definer RPC, which writes `stock_movements` and
 *    `branch_stock` atomically. Stock is never adjusted by a client-side write.
 */
const DOCS_FILE = dataFile("stock-docs.json");
const MOVES_FILE = dataFile("stock-movements.json");

export type StockOpType = "grn" | "return" | "damage";

/** +1 adds stock, -1 removes it. */
export const DIRECTION: Record<StockOpType, 1 | -1> = {
  grn: 1,
  return: 1,
  damage: -1,
};

export interface StockLineInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface StockLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface StockDoc {
  id: string;
  type: StockOpType;
  party: string | null;
  reference: string | null;
  note: string | null;
  date: string;
  lines: StockLine[];
  total: number;
  createdAt: string;
}

interface Movement {
  id: string;
  productId: string;
  delta: number;
  balanceAfter: number;
  reason: StockOpType;
  reference: string;
  createdAt: string;
}

interface StockDocInput {
  party?: string;
  reference?: string;
  note?: string;
  date?: string;
  lines: StockLineInput[];
}

function header(type: StockOpType, input: StockDocInput, lines: StockLine[]): StockDoc {
  return {
    id: type.toUpperCase() + "-" + randomUUID().slice(0, 8),
    type,
    party: input.party?.trim() || null,
    reference: input.reference?.trim() || null,
    note: input.note?.trim() || null,
    date: input.date || new Date().toISOString().slice(0, 10),
    lines,
    total: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    createdAt: new Date().toISOString(),
  };
}

/** Local backend: adjust the override map + append movements. */
async function createLocal(
  type: StockOpType,
  input: StockDocInput,
): Promise<StockDoc> {
  const dir = DIRECTION[type];
  const lines: StockLine[] = [];
  const movements = await readJsonFile<Movement[]>(MOVES_FILE, []);

  for (const l of input.lines) {
    const product = findById(l.productId);
    if (!product) throw new Error(`Unknown product: ${l.productId}`);
    const qty = Number(l.quantity);
    if (!(qty > 0)) throw new Error(`Invalid quantity for ${product.name}`);
    if (dir < 0 && product.quantity < qty) {
      throw new Error(`Only ${product.quantity} of ${product.name} in stock`);
    }

    const unitPrice = l.unitPrice != null ? Number(l.unitPrice) : product.costPrice;
    const newQty = Math.max(0, product.quantity + dir * qty);

    // GRN updates the product's cost price to the latest received cost.
    await upsertOverride({
      ...product,
      quantity: newQty,
      costPrice:
        type === "grn" && l.unitPrice != null ? unitPrice : product.costPrice,
    });

    movements.push({
      id: "MV-" + randomUUID().slice(0, 8),
      productId: product.id,
      delta: dir * qty,
      balanceAfter: newQty,
      reason: type,
      reference: input.reference ?? "",
      createdAt: new Date().toISOString(),
    });

    lines.push({ productId: product.id, name: product.name, quantity: qty, unitPrice });
  }

  await writeJsonFile(MOVES_FILE, movements);

  const doc = header(type, input, lines);
  const docs = await readJsonFile<StockDoc[]>(DOCS_FILE, []);
  await writeJsonFile(DOCS_FILE, [...docs, doc]);
  return doc;
}

export async function createStockDoc(
  type: StockOpType,
  input: StockDocInput,
): Promise<StockDoc> {
  if (!input.lines?.length) throw new Error("Add at least one line");

  const db = await resolveDb();
  if (!db) return createLocal(type, input);

  // Durable backend: resolve the caller's branch, then move stock through the
  // definer RPC so the movement ledger and branch balance stay consistent.
  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (!branch) throw new Error("No active branch for this organization");

  const dir = DIRECTION[type];
  const lines: StockLine[] = [];

  for (const l of input.lines) {
    const qty = Number(l.quantity);
    if (!(qty > 0)) throw new Error(`Invalid quantity for ${l.productId}`);

    const { data: product, error: productError } = await db
      .from("products")
      .select("id, name, cost_price")
      .eq("id", l.productId)
      .maybeSingle<{ id: string; name: string; cost_price: number }>();
    if (productError) throw new Error(productError.message);
    if (!product) throw new Error(`Unknown product: ${l.productId}`);

    // adjust_stock raises when a write-off would take the balance negative.
    const { error: adjustError } = await db.rpc("adjust_stock", {
      p_branch: branch.id,
      p_product: product.id,
      p_delta: dir * qty,
      p_note: `${type}:${input.reference?.trim() ?? ""}`,
    });
    if (adjustError) throw new Error(adjustError.message);

    lines.push({
      productId: product.id,
      name: product.name,
      quantity: qty,
      unitPrice: l.unitPrice != null ? Number(l.unitPrice) : product.cost_price,
    });
  }

  const doc = header(type, input, lines);
  const { error } = await db.from("stock_documents").insert({
    branch_id: branch.id,
    type,
    party: doc.party,
    reference: doc.reference,
    note: doc.note,
    total: doc.total,
    lines: doc.lines as unknown as Json,
  });
  if (error) throw new Error(error.message);
  return doc;
}

export async function listStockDocs(
  type: StockOpType,
  limit = 50,
): Promise<StockDoc[]> {
  const db = await resolveDb();
  if (!db) {
    const docs = await readJsonFile<StockDoc[]>(DOCS_FILE, []);
    return docs
      .filter((d) => d.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  const { data, error } = await db
    .from("stock_documents")
    .select("id, type, party, reference, note, total, lines, created_at")
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    party: row.party,
    reference: row.reference,
    note: row.note,
    date: String(row.created_at).slice(0, 10),
    lines: (row.lines ?? []) as unknown as StockLine[],
    total: Number(row.total),
    createdAt: row.created_at,
  }));
}
