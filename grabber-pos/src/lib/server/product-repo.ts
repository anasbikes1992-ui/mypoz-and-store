import "server-only";
import type { Product } from "@/lib/types";
import seed from "@/data/products.json";
import { readOverridesSync } from "./product-write-store";

export interface ProductQuery {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  categories: { name: string; count: number }[];
}

const DEFAULT_PAGE_SIZE = 60;
const MAX_PAGE_SIZE = 200;

const seedProducts = seed as Product[];

/**
 * Working product list = optional seed merged with the writable override map
 * (creates/edits/deletes). Production catalogue lives in Supabase; this seed
 * file stays empty so local demo does not ship a fake shop.
 */
function getProducts(): Product[] {
  const overrides = readOverridesSync();
  if (Object.keys(overrides).length === 0) return seedProducts;

  const byId = new Map(seedProducts.map((p) => [p.id, p]));
  for (const [id, value] of Object.entries(overrides)) {
    if (value === null) byId.delete(id);
    else byId.set(id, value);
  }
  return [...byId.values()];
}

function categoryHistogram(products: Product[]) {
  const counts = new Map<string, number>();
  for (const p of products) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function matches(p: Product, term: string): boolean {
  return (
    p.name.toLowerCase().includes(term) ||
    (p.nameLocal?.toLowerCase().includes(term) ?? false) ||
    p.barcodes.some((b) => b.toLowerCase().includes(term)) ||
    (p.brand?.toLowerCase().includes(term) ?? false)
  );
}

export function queryProducts(q: ProductQuery): ProductPage {
  const products = getProducts();
  const term = q.search?.trim().toLowerCase() ?? "";
  const pageSize = Math.min(q.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const page = Math.max(q.page ?? 1, 1);

  let filtered = products;
  if (q.category) {
    filtered = filtered.filter((p) => p.category === q.category);
  }
  if (term) {
    filtered = filtered.filter((p) => matches(p, term));
  }

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    categories: categoryHistogram(products),
  };
}

/** Exact barcode hit — used by the POS scanner input. */
export function findByBarcode(code: string): Product | undefined {
  const c = code.trim().toLowerCase();
  if (!c) return undefined;
  return getProducts().find((p) =>
    p.barcodes.some((b) => b.toLowerCase() === c),
  );
}

export function findById(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

/** Next product id above the seed's `P#####` range. */
export function nextProductId(): string {
  const products = getProducts();
  let max = 0;
  for (const p of products) {
    const m = /^P(\d+)$/.exec(p.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return "P" + String(max + 1).padStart(5, "0");
}

/** Every product in the working catalog (seed + overrides). */
export function allProducts(): Product[] {
  return getProducts();
}

export function inventoryStats() {
  const products = getProducts();
  let stockValue = 0;
  let lowStock = 0;
  let expired = 0;
  const now = Date.now();
  for (const p of products) {
    stockValue += p.costPrice * p.quantity;
    if (p.quantity <= 5) lowStock += 1;
    if (p.expireDate && new Date(p.expireDate).getTime() < now) expired += 1;
  }
  return { productCount: products.length, stockValue, lowStock, expired };
}
