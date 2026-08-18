import type { StoreBlock } from "./schema";

/** Block types for product page and composable sections (Shopify-style). */
export const PRODUCT_BLOCK_TYPES = [
  "product_gallery",
  "product_title",
  "product_price",
  "compare_at_price",
  "variant_selector",
  "quantity_selector",
  "add_to_cart",
  "buy_now",
  "product_description",
  "trust_badges",
  "shipping_info",
  "related_products",
  "reviews",
  "share_buttons",
] as const;
export type ProductBlockType = (typeof PRODUCT_BLOCK_TYPES)[number];

export const SECTION_BLOCK_TYPES = [
  "heading",
  "text",
  "image",
  "button",
  "spacer",
  "divider",
  "product_card",
  "collection_grid",
] as const;
export type SectionBlockType = (typeof SECTION_BLOCK_TYPES)[number];

export const PRODUCT_PAGE_BLOCKS: {
  type: ProductBlockType;
  label: string;
  defaultEnabled: boolean;
}[] = [
  { type: "product_gallery", label: "Product gallery", defaultEnabled: true },
  { type: "product_title", label: "Title", defaultEnabled: true },
  { type: "product_price", label: "Price", defaultEnabled: true },
  { type: "compare_at_price", label: "Compare-at price", defaultEnabled: true },
  { type: "variant_selector", label: "Variant selector", defaultEnabled: true },
  { type: "quantity_selector", label: "Quantity", defaultEnabled: true },
  { type: "add_to_cart", label: "Add to cart", defaultEnabled: true },
  { type: "buy_now", label: "Buy now", defaultEnabled: true },
  { type: "product_description", label: "Description", defaultEnabled: true },
  { type: "trust_badges", label: "Trust badges", defaultEnabled: true },
  { type: "shipping_info", label: "Shipping info", defaultEnabled: false },
  { type: "related_products", label: "Related products", defaultEnabled: true },
  { type: "reviews", label: "Reviews", defaultEnabled: false },
  { type: "share_buttons", label: "Share buttons", defaultEnabled: false },
];

export function defaultProductBlocks(): StoreBlock[] {
  return PRODUCT_PAGE_BLOCKS.filter((b) => b.defaultEnabled).map((b) => ({
    id: `blk_${b.type}`,
    type: b.type,
    enabled: true,
    settings: {},
  }));
}

export function productTemplateBlocks(store: {
  pages: { type: string; blocks?: StoreBlock[] }[];
}): StoreBlock[] {
  const page = store.pages.find((p) => p.type === "product");
  if (page?.blocks && page.blocks.length > 0) return page.blocks;
  return defaultProductBlocks();
}

export function isProductBlockOn(blocks: StoreBlock[], type: string): boolean {
  const match = blocks.find((b) => b.type === type);
  if (match) return match.enabled;
  return PRODUCT_PAGE_BLOCKS.find((b) => b.type === type)?.defaultEnabled ?? false;
}

export const BLOCK_LABELS: Record<string, string> = Object.fromEntries([
  ...PRODUCT_PAGE_BLOCKS.map((b) => [b.type, b.label]),
  ["heading", "Heading"],
  ["text", "Text"],
  ["image", "Image"],
  ["button", "Button"],
  ["spacer", "Spacer"],
  ["divider", "Divider"],
  ["product_card", "Product card"],
  ["collection_grid", "Collection grid"],
]);
