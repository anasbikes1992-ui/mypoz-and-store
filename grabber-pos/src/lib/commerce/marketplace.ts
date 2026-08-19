import { THEMES, THEME_LIST } from "./themes";
import type { CommerceThemeId } from "./schema";

export type MarketplaceTheme = {
  id: CommerceThemeId;
  name: string;
  tagline: string;
  publisher: "MyPoz";
  priceLkr: number;
  idealFor: string[];
};

/** Official MyPoz themes — configuration packs, never merchant executable code. */
export const MARKETPLACE_THEMES: MarketplaceTheme[] = THEME_LIST.map((t) => ({
  id: t.id,
  name: t.name,
  tagline: t.tagline,
  publisher: "MyPoz",
  priceLkr: 0,
  idealFor: t.idealFor,
}));

export function marketplaceTheme(id: CommerceThemeId) {
  return MARKETPLACE_THEMES.find((t) => t.id === id) ?? null;
}

export { THEMES };
