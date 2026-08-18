import { z } from "zod";

/** Canonical MyPoz storefront themes — not recolors of one template. */
export const COMMERCE_THEME_IDS = [
  "minimal",
  "fashion",
  "market",
  "food",
  "luxury",
  "local",
] as const;
export type CommerceThemeId = (typeof COMMERCE_THEME_IDS)[number];

export const STORE_STATUSES = [
  "draft",
  "published",
  "suspended",
  "archived",
] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export const SECTION_TYPES = [
  "announcement",
  "hero",
  "featured_collection",
  "product_grid",
  "image_text",
  "promo_banner",
  "testimonials",
  "brand_logos",
  "categories",
  "newsletter",
  "rich_text",
  "video",
  "spacer",
  "trust",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const PAGE_TYPES = [
  "home",
  "products",
  "collections",
  "product",
  "cart",
  "checkout",
  "search",
  "about",
  "contact",
  "faq",
  "shipping",
  "returns",
  "privacy",
  "terms",
  "custom",
  "blog",
  "article",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const CARD_STYLES = [
  "classic",
  "minimal",
  "image-first",
  "compact",
  "luxury",
  "dense",
] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const LOCALES = ["en", "si", "ta"] as const;
export type StoreLocale = (typeof LOCALES)[number];

export const navItemSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(60),
  href: z.string().max(300).default(""),
  children: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(60),
        href: z.string().max(300).default(""),
      }),
    )
    .max(12)
    .default([]),
});
export type NavItem = z.infer<typeof navItemSchema>;

export const sectionSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(SECTION_TYPES),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export type StoreSection = z.infer<typeof sectionSchema>;

export const blockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.string().min(1).max(40),
  enabled: z.boolean().default(true),
  settings: z.record(z.string(), z.unknown()).default({}),
});
export type StoreBlock = z.infer<typeof blockSchema>;

export const pageSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(PAGE_TYPES),
  title: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  visible: z.boolean().default(true),
  seoTitle: z.string().max(120).default(""),
  seoDescription: z.string().max(320).default(""),
  sections: z.array(sectionSchema).max(40).default([]),
  /** Product template blocks (Shopify-style). */
  blocks: z.array(blockSchema).max(24).default([]),
});
export type StorePage = z.infer<typeof pageSchema>;

/** Order channel stamped on sales.source */
export const SALE_SOURCES = [
  "POS",
  "ONLINE_STORE",
  "WHATSAPP",
  "PHONE",
  "OTHER",
] as const;
export type SaleSource = (typeof SALE_SOURCES)[number];

export const FULFILLMENT_STATUSES = [
  "pending",
  "processing",
  "ready",
  "shipped",
  "delivered",
  "collected",
  "cancelled",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const collectionRuleSchema = z.object({
  field: z.enum(["price", "tag", "category", "featured", "in_stock"]),
  op: z.enum(["eq", "lt", "lte", "gt", "gte"]),
  value: z.string().max(80),
});
export type CollectionRule = z.infer<typeof collectionRuleSchema>;

export const collectionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  description: z.string().max(400).default(""),
  /** POS category name, or "all". */
  sourceCategory: z.string().max(80).default("all"),
  featured: z.boolean().default(false),
  collectionType: z.enum(["manual", "automated"]).default("manual"),
  rules: z.array(collectionRuleSchema).max(12).default([]),
});
export type StoreCollection = z.infer<typeof collectionSchema>;

export const deliveryZoneSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  fee: z.number().min(0).max(1_000_000).default(0),
});

export const tokenOverrideSchema = z.object({
  primary: z.string().max(40).default(""),
  secondary: z.string().max(40).default(""),
  headingFont: z.string().max(80).default(""),
  bodyFont: z.string().max(80).default(""),
  radius: z.enum(["sharp", "soft", "pill"]).default("soft"),
  cardStyle: z.enum(CARD_STYLES).default("classic"),
  imageRatio: z.enum(["1:1", "4:5", "3:4", "16:9"]).default("4:5"),
  logoUrl: z.string().max(500).default(""),
  faviconUrl: z.string().max(500).default(""),
});
export type TokenOverride = z.infer<typeof tokenOverrideSchema>;

export const storeConfigSchema = z.object({
  name: z.string().min(1).max(160).default("MyPoz Store"),
  slug: z.string().min(1).max(80).default("main-store"),
  description: z.string().max(500).default(""),
  status: z.enum(STORE_STATUSES).default("draft"),
  themeId: z.enum(COMMERCE_THEME_IDS).default("local"),
  tokens: tokenOverrideSchema.default({
    primary: "",
    secondary: "",
    headingFont: "",
    bodyFont: "",
    radius: "soft",
    cardStyle: "classic",
    imageRatio: "4:5",
    logoUrl: "",
    faviconUrl: "",
  }),
  currency: z.string().min(3).max(8).default("LKR"),
  locale: z.enum(LOCALES).default("en"),
  timezone: z.string().max(64).default("Asia/Colombo"),
  contactEmail: z.string().max(160).default(""),
  contactPhone: z.string().max(40).default(""),
  address: z.string().max(240).default(""),
  announcement: z.string().max(200).default(""),
  seoTitle: z.string().max(120).default(""),
  seoDescription: z.string().max(320).default(""),
  social: z
    .object({
      facebook: z.string().max(200).default(""),
      instagram: z.string().max(200).default(""),
      twitter: z.string().max(200).default(""),
      tiktok: z.string().max(200).default(""),
      whatsapp: z.string().max(30).default(""),
    })
    .default({
      facebook: "",
      instagram: "",
      twitter: "",
      tiktok: "",
      whatsapp: "",
    }),
  navigation: z.array(navItemSchema).max(16).default([]),
  footerLinks: z.array(navItemSchema).max(16).default([]),
  pages: z.array(pageSchema).max(40).default([]),
  collections: z.array(collectionSchema).max(40).default([]),
  delivery: z
    .object({
      pickup: z.boolean().default(true),
      localDelivery: z.boolean().default(true),
      islandwide: z.boolean().default(true),
      freeThreshold: z.number().min(0).max(10_000_000).default(10000),
      zones: z.array(deliveryZoneSchema).max(20).default([]),
    })
    .default({
      pickup: true,
      localDelivery: true,
      islandwide: true,
      freeThreshold: 10000,
      zones: [],
    }),
  cod: z
    .object({
      enabled: z.boolean().default(true),
      minOrder: z.number().min(0).max(10_000_000).default(0),
      maxOrder: z.number().min(0).max(10_000_000).default(100000),
      fee: z.number().min(0).max(10000).default(0),
      requireConfirmation: z.boolean().default(false),
    })
    .default({
      enabled: true,
      minOrder: 0,
      maxOrder: 100000,
      fee: 0,
      requireConfirmation: false,
    }),
  customDomain: z.string().max(200).default(""),
  subdomain: z.string().max(80).default(""),
});
export type StoreConfig = z.infer<typeof storeConfigSchema>;

export const commerceDocumentSchema = z.object({
  draft: storeConfigSchema,
  published: storeConfigSchema.nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type CommerceDocument = z.infer<typeof commerceDocumentSchema>;

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function canonicalThemeId(value: string | null | undefined): CommerceThemeId {
  if (value === "classic") return "minimal";
  if (value === "bold") return "fashion";
  if ((COMMERCE_THEME_IDS as readonly string[]).includes(value ?? "")) {
    return value as CommerceThemeId;
  }
  return "local";
}

export function storePath(slug: string, path = ""): string {
  const trimmed = path.replace(/^\//, "");
  return trimmed ? `/store/${slug}/${trimmed}` : `/store/${slug}`;
}
