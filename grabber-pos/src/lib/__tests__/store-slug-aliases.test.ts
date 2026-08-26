import { describe, expect, it } from "vitest";
import {
  isReservedStorefrontSlug,
  resolveStoreSlugAlias,
} from "@/lib/store-slug-aliases";

describe("store slug aliases", () => {
  it("maps launch aliases to anaz-store when no direct storefront", () => {
    expect(resolveStoreSlugAlias("main-store")).toBe("anaz-store");
    expect(resolveStoreSlugAlias("shopping-station")).toBe("anaz-store");
  });

  it("does not steal a slug that already has a storefront", () => {
    expect(
      resolveStoreSlugAlias("main-store", { hasDirectStorefront: true }),
    ).toBeNull();
  });

  it("reserves Anaz continuity slugs", () => {
    expect(isReservedStorefrontSlug("main-store")).toBe(true);
    expect(isReservedStorefrontSlug("anaz-store")).toBe(true);
    expect(isReservedStorefrontSlug("pilot-02")).toBe(false);
  });
});
