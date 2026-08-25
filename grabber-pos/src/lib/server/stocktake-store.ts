import "server-only";
import { randomUUID } from "crypto";
import { findById } from "./product-repo";
import { upsertOverride } from "./product-write-store";
import { recordStore } from "./persistence/record-store";
import { resolveDb } from "./persistence/backend";

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data, error } = await typed
      .from("stocktakes")
      .select(
        "id, status, note, created_at, posted_at, stocktake_lines(product_id, system_qty, counted_qty, variance, products(name))",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      status: row.status,
      note: row.note ?? null,
      createdAt: row.created_at,
      postedAt: row.posted_at ?? null,
      lines: ((row.stocktake_lines ?? []) as any[]).map((line) => ({
        productId: line.product_id,
        name: line.products?.name ?? line.product_id,
        systemQty: Number(line.system_qty ?? 0),
        countedQty: Number(line.counted_qty ?? 0),
        variance: Number(line.variance ?? 0),
      })),
    }));
  }
  return (await store.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createStocktake(input: {
  note?: string;
  lines: { productId: string; countedQty: number }[];
}): Promise<Stocktake> {
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data: branch } = await typed
      .from("branches")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!branch?.id) throw new Error("No active branch for this organization");

    const ids = [...new Set(input.lines.map((line) => String(line.productId)))];
    const { data: products, error: productError } = await typed
      .from("products")
      .select("id, name")
      .in("id", ids);
    if (productError) throw new Error(productError.message);
    const productMap = new Map(
      ((products ?? []) as { id: string; name: string }[]).map((row) => [row.id, row]),
    );

    const { data: stockRows, error: stockError } = await typed
      .from("branch_stock")
      .select("product_id, quantity")
      .eq("branch_id", branch.id)
      .in("product_id", ids);
    if (stockError) throw new Error(stockError.message);
    const stockMap = new Map(
      ((stockRows ?? []) as { product_id: string; quantity: number }[]).map((row) => [
        row.product_id,
        Number(row.quantity ?? 0),
      ]),
    );

    const doc: Stocktake = {
      id: "ST-" + randomUUID().slice(0, 8).toUpperCase(),
      status: "draft",
      note: input.note?.trim() || null,
      createdAt: new Date().toISOString(),
      postedAt: null,
      lines: input.lines.map((line) => {
        const product = productMap.get(String(line.productId));
        if (!product) throw new Error(`Unknown product ${line.productId}`);
        const systemQty = Number(stockMap.get(product.id) ?? 0);
        const countedQty = Math.max(0, Number(line.countedQty) || 0);
        return {
          productId: product.id,
          name: product.name,
          systemQty,
          countedQty,
          variance: countedQty - systemQty,
        };
      }),
    };

    const { error: headerError } = await typed.from("stocktakes").insert({
      id: doc.id,
      branch_id: branch.id,
      status: doc.status,
      note: doc.note,
      created_at: doc.createdAt,
    });
    if (headerError) throw new Error(headerError.message);

    const { error: lineError } = await typed.from("stocktake_lines").insert(
      doc.lines.map((line) => ({
        stocktake_id: doc.id,
        product_id: line.productId,
        system_qty: line.systemQty,
        counted_qty: line.countedQty,
        variance: line.variance,
      })),
    );
    if (lineError) throw new Error(lineError.message);
    return doc;
  }

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
  const db = await resolveDb();
  if (db) {
    const typed = db as any;
    const { data: header, error: headerError } = await typed
      .from("stocktakes")
      .select("id, branch_id, status, note, created_at, posted_at")
      .eq("id", id)
      .maybeSingle();
    if (headerError) throw new Error(headerError.message);
    if (!header) throw new Error("Stocktake not found");
    if (header.status === "posted") {
      const { data: existingLines, error: existingLinesError } = await typed
        .from("stocktake_lines")
        .select("product_id, system_qty, counted_qty, variance, products(name)")
        .eq("stocktake_id", id);
      if (existingLinesError) throw new Error(existingLinesError.message);
      return {
        id: header.id,
        status: "posted",
        note: header.note ?? null,
        createdAt: header.created_at,
        postedAt: header.posted_at ?? null,
        lines: ((existingLines ?? []) as any[]).map((line) => ({
          productId: line.product_id,
          name: line.products?.name ?? line.product_id,
          systemQty: Number(line.system_qty ?? 0),
          countedQty: Number(line.counted_qty ?? 0),
          variance: Number(line.variance ?? 0),
        })),
      };
    }

    const { data: lines, error: lineError } = await typed
      .from("stocktake_lines")
      .select("product_id, system_qty, counted_qty, variance, products(name)")
      .eq("stocktake_id", id);
    if (lineError) throw new Error(lineError.message);

    for (const line of (lines ?? []) as any[]) {
      const { error: adjustError } = await typed.rpc("set_branch_stock", {
        p_branch: header.branch_id,
        p_product: line.product_id,
        p_quantity: Number(line.counted_qty ?? 0),
        p_note: `stocktake:${id}`,
      });
      if (adjustError) throw new Error(adjustError.message);
    }

    const postedAt = new Date().toISOString();
    const { error: updateError } = await typed
      .from("stocktakes")
      .update({ status: "posted", posted_at: postedAt })
      .eq("id", id);
    if (updateError) throw new Error(updateError.message);

    return {
      id: header.id,
      status: "posted",
      note: header.note ?? null,
      createdAt: header.created_at,
      postedAt,
      lines: ((lines ?? []) as any[]).map((line) => ({
        productId: line.product_id,
        name: line.products?.name ?? line.product_id,
        systemQty: Number(line.system_qty ?? 0),
        countedQty: Number(line.counted_qty ?? 0),
        variance: Number(line.variance ?? 0),
      })),
    };
  }

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
