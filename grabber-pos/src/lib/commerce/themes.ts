import { COMMERCE_THEME_IDS, type CardStyle, type CommerceThemeId } from "./schema";

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  headingFont: string;
  bodyFont: string;
  radius: "sharp" | "soft" | "pill";
  maxWidth: string;
  cardStyle: CardStyle;
  headerStyle: "solid" | "transparent" | "editorial";
  heroStyle: "split" | "fullbleed" | "stacked" | "banner";
}

export interface ThemeDefinition {
  id: CommerceThemeId;
  name: string;
  tagline: string;
  idealFor: string[];
  tokens: ThemeTokens;
}

export const THEMES: Record<CommerceThemeId, ThemeDefinition> = {
  minimal: {
    id: "minimal",
    name: "Minimal",
    tagline: "Clean catalogue. Quiet luxury of space.",
    idealFor: ["electronics", "general retail", "lifestyle"],
    tokens: {
      primary: "oklch(22% 0.02 95)",
      secondary: "oklch(45% 0.02 95)",
      accent: "oklch(22% 0.02 95)",
      background: "oklch(99% 0.002 95)",
      surface: "oklch(100% 0 0)",
      text: "oklch(18% 0.01 95)",
      muted: "oklch(52% 0.01 95)",
      border: "oklch(90% 0.008 95)",
      success: "oklch(45% 0.12 145)",
      warning: "oklch(70% 0.14 85)",
      error: "oklch(55% 0.18 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "sharp",
      maxWidth: "72rem",
      cardStyle: "minimal",
      headerStyle: "solid",
      heroStyle: "split",
    },
  },
  fashion: {
    id: "fashion",
    name: "Fashion",
    tagline: "Large photography. Editorial rhythm.",
    idealFor: ["clothing", "shoes", "jewellery", "accessories"],
    tokens: {
      primary: "oklch(18% 0.04 20)",
      secondary: "oklch(55% 0.12 20)",
      accent: "oklch(48% 0.16 20)",
      background: "oklch(97% 0.01 40)",
      surface: "oklch(100% 0 0)",
      text: "oklch(16% 0.03 20)",
      muted: "oklch(48% 0.03 20)",
      border: "oklch(88% 0.03 30)",
      success: "oklch(48% 0.12 145)",
      warning: "oklch(68% 0.14 75)",
      error: "oklch(54% 0.2 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "sharp",
      maxWidth: "80rem",
      cardStyle: "image-first",
      headerStyle: "transparent",
      heroStyle: "fullbleed",
    },
  },
  market: {
    id: "market",
    name: "Market",
    tagline: "Dense catalogue. Built for weekly shops.",
    idealFor: ["grocery", "supermarkets", "household goods"],
    tokens: {
      primary: "#c81e1e",
      secondary: "#111827",
      accent: "#c81e1e",
      background: "oklch(98% 0.01 30)",
      surface: "oklch(100% 0 0)",
      text: "oklch(22% 0.03 30)",
      muted: "oklch(45% 0.02 30)",
      border: "oklch(88% 0.02 30)",
      success: "oklch(50% 0.15 145)",
      warning: "oklch(70% 0.15 85)",
      error: "oklch(55% 0.18 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "soft",
      maxWidth: "84rem",
      cardStyle: "dense",
      headerStyle: "solid",
      heroStyle: "banner",
    },
  },
  food: {
    id: "food",
    name: "Food",
    tagline: "Warm, hungry, order-first.",
    idealFor: ["restaurants", "bakeries", "cafes", "cloud kitchens"],
    tokens: {
      primary: "oklch(48% 0.16 50)",
      secondary: "oklch(62% 0.14 70)",
      accent: "oklch(55% 0.18 45)",
      background: "oklch(97% 0.02 70)",
      surface: "oklch(100% 0 0)",
      text: "oklch(22% 0.04 50)",
      muted: "oklch(45% 0.04 50)",
      border: "oklch(88% 0.04 60)",
      success: "oklch(50% 0.14 145)",
      warning: "oklch(70% 0.14 80)",
      error: "oklch(54% 0.18 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "pill",
      maxWidth: "68rem",
      cardStyle: "classic",
      headerStyle: "solid",
      heroStyle: "stacked",
    },
  },
  luxury: {
    id: "luxury",
    name: "Luxury",
    tagline: "Editorial. Slow. Considered.",
    idealFor: ["jewellery", "premium fashion", "cosmetics"],
    tokens: {
      primary: "oklch(28% 0.04 80)",
      secondary: "oklch(62% 0.08 80)",
      accent: "oklch(42% 0.08 80)",
      background: "oklch(97% 0.01 85)",
      surface: "oklch(99% 0.005 85)",
      text: "oklch(18% 0.03 80)",
      muted: "oklch(48% 0.03 80)",
      border: "oklch(86% 0.03 80)",
      success: "oklch(45% 0.1 145)",
      warning: "oklch(68% 0.12 80)",
      error: "oklch(50% 0.16 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "sharp",
      maxWidth: "64rem",
      cardStyle: "luxury",
      headerStyle: "editorial",
      heroStyle: "fullbleed",
    },
  },
  local: {
    id: "local",
    name: "Local Business",
    tagline: "Simple conversion for Sri Lankan SMEs.",
    idealFor: ["neighbourhood shops", "pharmacies", "hardware", "gift shops"],
    tokens: {
      primary: "oklch(48% 0.14 165)",
      secondary: "oklch(55% 0.12 200)",
      accent: "oklch(52% 0.14 165)",
      background: "oklch(97% 0.015 160)",
      surface: "oklch(100% 0 0)",
      text: "oklch(22% 0.04 160)",
      muted: "oklch(46% 0.03 160)",
      border: "oklch(86% 0.03 160)",
      success: "oklch(50% 0.14 145)",
      warning: "oklch(70% 0.14 85)",
      error: "oklch(55% 0.18 25)",
      headingFont: "var(--font-app-sans)",
      bodyFont: "var(--font-app-sans)",
      radius: "soft",
      maxWidth: "72rem",
      cardStyle: "classic",
      headerStyle: "solid",
      heroStyle: "stacked",
    },
  },
};

export const THEME_LIST = COMMERCE_THEME_IDS.map((id) => THEMES[id]);

export function themeClass(id: CommerceThemeId): string {
  return `theme-storefront theme-mypoz theme-mypoz-${id}`;
}

/** Apply published store token overrides as CSS variables (brand primary wins over theme pack). */
export function storeTokenStyle(tokens: {
  primary?: string;
  secondary?: string;
}): Record<string, string> {
  const style: Record<string, string> = {};
  const primary = tokens.primary?.trim();
  if (primary) {
    style["--accent"] = primary;
    style["--accent-strong"] = `color-mix(in srgb, ${primary} 82%, black)`;
  }
  const secondary = tokens.secondary?.trim();
  if (secondary) {
    style["--text-strong"] = secondary;
  }
  return style;
}
