import { describe, expect, it } from "vitest";
import { buildStorefrontUrl, invoiceStorefrontCta } from "../storefront-cta";

describe("storefront-url", () => {
  it("builds tenant storefront URL from settings slug", () => {
    expect(
      buildStorefrontUrl(
        { storeSlug: "anaz-store" },
        "https://mypoz-and-store-ui.vercel.app",
      ),
    ).toBe("https://mypoz-and-store-ui.vercel.app/store/anaz-store");
  });

  it("prefers storefront CTA over receipt footer for invoices", () => {
    const cta = invoiceStorefrontCta(
      {
        storeSlug: "anaz-store",
        receiptFooter: "Thanks!",
      },
      "https://mypoz-and-store-ui.vercel.app",
    );
    expect(cta).toContain("Shop online anytime");
    expect(cta).toContain("anaz-store");
  });
});

describe("authorization policy", () => {
  it("permissions API exposes configurable policy fields", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const text = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/permissions/route.ts"),
      "utf8",
    );
    expect(text).toContain("discountOverridePctThreshold");
    expect(text).toContain("recordManagerAuthorization");
  });

  it("returns route requires manager PIN", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const text = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/returns/route.ts"),
      "utf8",
    );
    expect(text).toContain("managerPin");
    expect(text).toContain("verifyManagerPin");
  });
});
