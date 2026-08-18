import { describe, expect, it } from "vitest";
import {
  defaultProductBlocks,
  isProductBlockOn,
  productTemplateBlocks,
} from "@/lib/commerce/blocks";

describe("product page blocks", () => {
  it("falls back to defaults when the product page has no blocks", () => {
    const blocks = productTemplateBlocks({ pages: [] });
    expect(blocks.length).toBeGreaterThan(0);
    expect(isProductBlockOn(blocks, "product_title")).toBe(true);
    expect(isProductBlockOn(blocks, "reviews")).toBe(false);
  });

  it("honours disabled blocks on the product page", () => {
    const custom = defaultProductBlocks().map((b) =>
      b.type === "product_description" ? { ...b, enabled: false } : b,
    );
    expect(isProductBlockOn(custom, "product_description")).toBe(false);
    expect(isProductBlockOn(custom, "add_to_cart")).toBe(true);
  });
});
