import { describe, expect, it } from "vitest";
import {
  canonicalThemeId,
  storeConfigSchema,
  storePath,
  COMMERCE_THEME_IDS,
} from "../schema";
import { defaultStoreConfig } from "../defaults";
import { THEMES } from "../themes";
import { storeCopy } from "../i18n";

describe("commerce store schema", () => {
  it("seeds a ready-to-edit store, not a blank page", () => {
    const store = defaultStoreConfig({ name: "Lanka Streetwear" });
    const home = store.pages.find((p) => p.type === "home");
    expect(home?.sections.length).toBeGreaterThan(3);
    expect(home?.sections.some((s) => s.type === "hero")).toBe(true);
    expect(store.navigation.length).toBeGreaterThan(0);
    expect(store.delivery.zones.length).toBe(2);
  });

  it("rejects unknown themes", () => {
    expect(() =>
      storeConfigSchema.parse({ name: "X", themeId: "shopify-clone" }),
    ).toThrow();
  });

  it("maps legacy website themes onto canonical ids", () => {
    expect(canonicalThemeId("classic")).toBe("minimal");
    expect(canonicalThemeId("bold")).toBe("fashion");
    expect(canonicalThemeId("local")).toBe("local");
  });

  it("gives each theme a distinct card style / hero", () => {
    const cards = new Set(COMMERCE_THEME_IDS.map((id) => THEMES[id].tokens.cardStyle));
    const heros = new Set(COMMERCE_THEME_IDS.map((id) => THEMES[id].tokens.heroStyle));
    expect(cards.size).toBeGreaterThan(3);
    expect(heros.size).toBeGreaterThan(2);
  });

  it("keeps draft and published as separate snapshots", () => {
    const draft = defaultStoreConfig({ name: "Draft Shop", announcement: "DRAFT" });
    const published = defaultStoreConfig({ name: "Live Shop", announcement: "LIVE" });
    expect(draft.announcement).not.toBe(published.announcement);
    expect(storeConfigSchema.parse(draft).status).toBe("draft");
  });

  it("builds tenant-scoped storefront paths without leaking ids", () => {
    expect(storePath("apex-retail", "products/nike-air-max")).toBe(
      "/store/apex-retail/products/nike-air-max",
    );
  });
});

describe("storefront copy", () => {
  it("returns Sinhala and Tamil dictionaries", () => {
    expect(storeCopy("si").addToCart).not.toBe(storeCopy("en").addToCart);
    expect(storeCopy("ta").checkout).toBeTruthy();
  });
});
