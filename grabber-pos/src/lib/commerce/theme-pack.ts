import type { CommerceThemeId } from "./schema";
import { THEMES } from "./themes";

export interface ThemePackMeta {
  id: CommerceThemeId;
  version: string;
  name: string;
  industry: string[];
  description: string;
  screenshots: string[];
}

export interface ThemePack {
  meta: ThemePackMeta;
  tokens: (typeof THEMES)[CommerceThemeId]["tokens"];
  templates: ThemePackTemplates;
  presets: ThemePreset[];
}

export interface ThemePackTemplates {
  home: string[];
  product: string[];
  collection: string[];
  cart: string[];
  checkout: string[];
  page: string[];
}

export interface ThemePreset {
  id: string;
  name: string;
  industry: string;
  themeId: CommerceThemeId;
  /** Override tokens for this preset. */
  tokenOverrides?: Record<string, string>;
}

/** Canonical theme pack format — configuration only, no executable code. */
export function buildThemePack(themeId: CommerceThemeId): ThemePack {
  const theme = THEMES[themeId];
  return {
    meta: {
      id: themeId,
      version: "1.0.0",
      name: theme.name,
      industry: theme.idealFor ?? ["general"],
      description: theme.tagline ?? "",
      screenshots: [],
    },
    tokens: theme.tokens,
    templates: {
      home: [
        "announcement",
        "hero",
        "featured_collection",
        "categories",
        "product_grid",
        "promo_banner",
        "testimonials",
        "newsletter",
        "trust",
      ],
      product: [
        "product_gallery",
        "product_title",
        "product_price",
        "variant_selector",
        "add_to_cart",
        "product_description",
        "related_products",
      ],
      collection: ["hero", "product_grid"],
      cart: ["cart_items", "cart_summary"],
      checkout: ["checkout_form", "order_summary"],
      page: ["rich_text", "image_text"],
    },
    presets: INDUSTRY_PRESETS.filter((p) => p.themeId === themeId),
  };
}

export const INDUSTRY_PRESETS: ThemePreset[] = [
  { id: "fashion-editorial", name: "Fashion Editorial", industry: "fashion", themeId: "fashion" },
  { id: "fashion-minimal", name: "Fashion Minimal", industry: "fashion", themeId: "minimal" },
  { id: "streetwear", name: "Streetwear", industry: "fashion", themeId: "fashion" },
  { id: "luxury-fashion", name: "Luxury Fashion", industry: "fashion", themeId: "luxury" },
  { id: "restaurant", name: "Restaurant", industry: "food", themeId: "food" },
  { id: "cafe", name: "Cafe", industry: "food", themeId: "food" },
  { id: "supermarket", name: "Supermarket", industry: "grocery", themeId: "market" },
  { id: "electronics", name: "Electronics", industry: "electronics", themeId: "minimal" },
  { id: "salon", name: "Salon & Beauty", industry: "services", themeId: "luxury" },
  { id: "sri-lankan-sme", name: "Sri Lankan SME", industry: "local", themeId: "local" },
  { id: "boutique", name: "Boutique", industry: "local", themeId: "local" },
  { id: "home-business", name: "Home Business", industry: "local", themeId: "local" },
];

export function presetsForIndustry(industry: string): ThemePreset[] {
  return INDUSTRY_PRESETS.filter((p) => p.industry === industry);
}

export function allThemePacks(): ThemePack[] {
  return (Object.keys(THEMES) as CommerceThemeId[]).map(buildThemePack);
}
