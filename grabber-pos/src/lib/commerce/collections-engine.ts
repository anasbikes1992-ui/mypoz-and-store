import type { CollectionRule } from "./schema";

export type { CollectionRule };

export type CollectionProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  stock: number;
  category?: string | null;
  tags?: string[];
  featured?: boolean;
};

/** Client-side smart collection evaluation (mirrors SQL collection_matches_rules). */
export function productMatchesRules(
  product: CollectionProduct,
  rules: CollectionRule[],
  sourceCategory = "all",
): boolean {
  if (sourceCategory && sourceCategory !== "all") {
    if (product.category !== sourceCategory) return false;
  }
  if (!rules.length) return true;

  for (const rule of rules) {
    const price = product.price;
    switch (rule.field) {
      case "price":
        if (rule.op === "lt" && !(price < Number(rule.value))) return false;
        if (rule.op === "lte" && !(price <= Number(rule.value))) return false;
        if (rule.op === "gt" && !(price > Number(rule.value))) return false;
        if (rule.op === "gte" && !(price >= Number(rule.value))) return false;
        break;
      case "tag":
        if (rule.op === "eq" && !(product.tags ?? []).includes(rule.value)) return false;
        break;
      case "category":
        if (rule.op === "eq" && product.category !== rule.value) return false;
        break;
      case "featured":
        if (rule.op === "eq" && product.featured !== (rule.value === "true")) return false;
        break;
      case "in_stock":
        if (rule.op === "eq" && (product.stock > 0) !== (rule.value === "true")) return false;
        break;
    }
  }
  return true;
}

export function filterCollectionProducts(
  products: CollectionProduct[],
  rules: CollectionRule[],
  sourceCategory = "all",
): CollectionProduct[] {
  return products.filter((p) => productMatchesRules(p, rules, sourceCategory));
}

/** Built-in smart collection templates. */
export const SMART_COLLECTION_TEMPLATES = [
  {
    id: "under-5000",
    title: "Under LKR 5,000",
    rules: [{ field: "price" as const, op: "lt" as const, value: "5000" }],
  },
  {
    id: "new-arrivals",
    title: "New Arrivals",
    rules: [{ field: "tag" as const, op: "eq" as const, value: "new" }],
  },
  {
    id: "best-sellers",
    title: "Best Sellers",
    rules: [{ field: "tag" as const, op: "eq" as const, value: "bestseller" }],
  },
  {
    id: "in-stock",
    title: "In Stock",
    rules: [{ field: "in_stock" as const, op: "eq" as const, value: "true" }],
  },
  {
    id: "featured",
    title: "Featured",
    rules: [{ field: "featured" as const, op: "eq" as const, value: "true" }],
  },
] as const;
