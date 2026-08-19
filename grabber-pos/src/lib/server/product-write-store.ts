import "server-only";
import { promises as fs } from "fs";
import { readFileSync } from "fs";
import path from "path";
import type { Product } from "@/lib/types";

/**
 * Writable overlay for the local JSON backend. src/data/products.json is an
 * empty seed; creates, edits and deletes persist here as an override map.
 * In production, Supabase is the store and this file is unused.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const OVERRIDES_FILE = path.join(DATA_DIR, "product-overrides.json");

export type OverrideMap = Record<string, Product | null>;

export function readOverridesSync(): OverrideMap {
  try {
    return JSON.parse(readFileSync(OVERRIDES_FILE, "utf8")) as OverrideMap;
  } catch {
    return {};
  }
}

async function readOverrides(): Promise<OverrideMap> {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_FILE, "utf8")) as OverrideMap;
  } catch {
    return {};
  }
}

async function writeOverrides(map: OverrideMap): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = OVERRIDES_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(map, null, 2), "utf8");
  await fs.rename(tmp, OVERRIDES_FILE);
}

export async function upsertOverride(product: Product): Promise<void> {
  const map = await readOverrides();
  map[product.id] = product;
  await writeOverrides(map);
}

export async function deleteOverride(id: string): Promise<void> {
  const map = await readOverrides();
  map[id] = null;
  await writeOverrides(map);
}

/** Bulk upsert — a single file write for the whole batch (Excel import). */
export async function upsertMany(products: Product[]): Promise<void> {
  const map = await readOverrides();
  for (const product of products) map[product.id] = product;
  await writeOverrides(map);
}
