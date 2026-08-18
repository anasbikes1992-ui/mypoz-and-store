import { describe, expect, it } from "vitest";
import {
  filterCollectionProducts,
  productMatchesRules,
} from "@/lib/commerce/collections-engine";

const products = [
  {
    id: "1",
    slug: "cheap",
    name: "Cheap item",
    price: 3000,
    stock: 5,
    category: "Shoes",
    tags: ["new"],
    featured: false,
  },
  {
    id: "2",
    slug: "expensive",
    name: "Premium",
    price: 12000,
    stock: 2,
    category: "Shoes",
    tags: ["bestseller"],
    featured: true,
  },
];

describe("collections-engine", () => {
  it("filters by price rule", () => {
    const rules = [{ field: "price" as const, op: "lt" as const, value: "5000" }];
    const result = filterCollectionProducts(products, rules);
    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe("cheap");
  });

  it("filters by tag rule", () => {
    const rules = [{ field: "tag" as const, op: "eq" as const, value: "new" }];
    expect(productMatchesRules(products[0]!, rules)).toBe(true);
    expect(productMatchesRules(products[1]!, rules)).toBe(false);
  });

  it("respects source category filter", () => {
    const rules: { field: "price"; op: "lt"; value: string }[] = [];
    expect(productMatchesRules(products[0]!, rules, "Electronics")).toBe(false);
    expect(productMatchesRules(products[0]!, rules, "Shoes")).toBe(true);
  });
});
