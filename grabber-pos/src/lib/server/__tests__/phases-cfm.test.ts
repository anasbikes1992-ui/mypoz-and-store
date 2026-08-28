import { describe, expect, it } from "vitest";
import { shouldShowPlatformBranding } from "@/lib/commerce/plan-branding";

describe("plan-branding", () => {
  it("shows platform branding on starter only", () => {
    expect(shouldShowPlatformBranding("starter")).toBe(true);
    expect(shouldShowPlatformBranding("business")).toBe(false);
    expect(shouldShowPlatformBranding("enterprise")).toBe(false);
  });
});

describe("phase C product share", () => {
  it("enables share_buttons by default on product pages", async () => {
    const { PRODUCT_PAGE_BLOCKS } = await import("@/lib/commerce/blocks");
    const share = PRODUCT_PAGE_BLOCKS.find((b) => b.type === "share_buttons");
    expect(share?.defaultEnabled).toBe(true);
  });
});

describe("phase F payment replay", () => {
  it("replay API is owner-gated", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const text = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/ops/replay-payments/route.ts"),
      "utf8",
    );
    expect(text).toContain("requireRoles");
    expect(text).toContain("replayUnprocessedPaymentEvents");
  });
});
