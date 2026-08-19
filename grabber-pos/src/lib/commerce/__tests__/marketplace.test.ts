import { describe, expect, it } from "vitest";
import { MARKETPLACE_THEMES } from "@/lib/commerce/marketplace";
import { THEME_LIST } from "@/lib/commerce/themes";

describe("theme marketplace", () => {
  it("lists the six official config themes as free installs", () => {
    expect(MARKETPLACE_THEMES).toHaveLength(THEME_LIST.length);
    expect(MARKETPLACE_THEMES.every((t) => t.publisher === "MyPoz")).toBe(true);
    expect(MARKETPLACE_THEMES.every((t) => t.priceLkr === 0)).toBe(true);
  });
});
