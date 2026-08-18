import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { upsertOverride } from "./product-write-store";
import { recordStore } from "./persistence/record-store";

export interface StocktakeLine {
  productId: string;
  name: string;
  systemQty: number;
  countedQty: number;
  variance: number;
}

export interface Stocktake {
  id: string;
  status: "draft" | "posted";
  note: string | null;
  createdAt: string;
  postedAt: string | null;
  lines: StocktakeLine[];
}

const store = recordStore<Stocktake>({
  collection: "stocktakes",
  file: "stocktakes.json",
});

export async function listStocktakes(): Promise<Stocktake[]> {
  return (await store.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createStocktake(input: {
  note?: string;
  lines: { productId: string; countedQty: number }[];
}): Promise<Stocktake> {
  const lines: StocktakeLine[] = input.lines.map((l) => {
    const p = findById(l.productId);
    if (!p) throw new Error(`Unknown product ${l.productId}`);
    const counted = Math.max(0, Number(l.countedQty) || 0);
    return {
      productId: p.id,
      name: p.name,
      systemQty: p.quantity,
      countedQty: counted,
      variance: counted - p.quantity,
    };
  });
  const doc: Stocktake = {
    id: "ST-" + randomUUID().slice(0, 8).toUpperCase(),
    status: "draft",
    note: input.note?.trim() || null,
    createdAt: new Date().toISOString(),
    postedAt: null,
    lines,
  };
  return store.put(doc);
}

export async function postStocktake(id: string): Promise<Stocktake> {
  const doc = await store.get(id);
  if (!doc) throw new Error("Stocktake not found");
  if (doc.status === "posted") return doc;
  for (const line of doc.lines) {
    const p = findById(line.productId);
    if (!p) continue;
    await upsertOverride({ ...p, quantity: line.countedQty });
  }
  const posted: Stocktake = {
    ...doc,
    status: "posted",
    postedAt: new Date().toISOString(),
  };
  return store.put(posted);
}
