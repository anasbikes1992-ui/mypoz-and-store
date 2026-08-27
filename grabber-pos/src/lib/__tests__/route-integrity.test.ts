import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { MODULE_GROUPS } from "@/lib/modules";
import { HQ_NAV, HQ_DOC_PAGES } from "@/lib/hq";

const ROOT = path.resolve(__dirname, "../../..");

function pageCandidates(href: string): string[] {
  const clean = href.split("?")[0].replace(/\/$/, "") || "/";
  if (clean.startsWith("/api/")) {
    return [
      path.join(ROOT, "src/app", clean, "route.ts"),
      path.join(ROOT, "src/app", `${clean}/route.ts`),
    ];
  }
  return [
    path.join(ROOT, "src/app/(app)", clean, "page.tsx"),
    path.join(ROOT, "src/app", clean, "page.tsx"),
  ];
}

describe("route integrity", () => {
  it("every launcher tile href has a page or API route", () => {
    const missing: string[] = [];
    for (const group of MODULE_GROUPS) {
      for (const tile of group.tiles) {
        if (tile.status !== "active" || !tile.href) continue;
        const found = pageCandidates(tile.href).some((p) => existsSync(p));
        if (!found) missing.push(`${tile.key} → ${tile.href}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every HQ nav item has a page", () => {
    const missing = HQ_NAV.filter(
      (item) =>
        !existsSync(path.join(ROOT, "src/app", item.href, "page.tsx")),
    ).map((item) => item.href);
    expect(missing).toEqual([]);
  });

  it("HQ doc pointers exist on disk", () => {
    const missing = HQ_DOC_PAGES.filter((doc) => {
      const repo = path.join(ROOT, "..", doc.docPath);
      const app = path.join(ROOT, doc.docPath);
      return !existsSync(repo) && !existsSync(app);
    }).map((d) => d.docPath);
    expect(missing).toEqual([]);
  });

  it("critical API routes exist", () => {
    const routes = [
      "src/app/api/health/route.ts",
      "src/app/api/billing/route.ts",
      "src/app/api/observability/events/route.ts",
      "src/app/api/commerce/theme/route.ts",
      "src/app/api/store/[slug]/order/route.ts",
      "src/app/api/auth/login/route.ts",
      "src/app/api/auth/forgot-password/route.ts",
      "src/app/api/email/preview/route.ts",
      "src/app/api/knowledge/route.ts",
      "src/app/api/knowledge/[id]/route.ts",
      "src/app/api/approvals/route.ts",
      "src/app/api/approvals/[id]/route.ts",
      "src/app/api/ai/chat/route.ts",
    ];
    expect(routes.filter((r) => !existsSync(path.join(ROOT, r)))).toEqual([]);
  });
});
