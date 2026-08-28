import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src/app/api");

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("auth + RLS coverage for transformed domains", () => {
  it("protects P0 management routes with requireTenantSession", () => {
    const routes = [
      "audit/route.ts",
      "register/route.ts",
      "stocktake/route.ts",
      "transfers/route.ts",
      "purchase-orders/route.ts",
      "billing/route.ts",
      "commerce/orders/[id]/fulfill/route.ts",
      "whatsapp/inbox/route.ts",
      "ai/settings/route.ts",
      "returns/route.ts",
      "reports/summary/route.ts",
      "sales/[id]/void/route.ts",
    ];
    for (const rel of routes) {
      const text = read(rel);
      expect(text, rel).toContain("requireTenantSession");
    }
  });

  it("restricts write-sensitive inventory routes to owner/manager", () => {
    for (const rel of [
      "stocktake/route.ts",
      "transfers/route.ts",
      "purchase-orders/route.ts",
      "returns/route.ts",
    ]) {
      const text = read(rel);
      expect(text, rel).toContain("requireRoles");
      expect(text, rel).toMatch(/\["owner",\s*"manager"\]/);
    }
  });

  it("void sale uses transactional void_sale RPC in durable repository", () => {
    const repo = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/repositories/supabase.ts"),
      "utf8",
    );
    expect(repo).toContain('rpc("void_sale"');
    expect(repo).not.toMatch(/\.update\(\{\s*status:\s*"voided"/);
  });

  it("docs cover authorization and RLS matrices", () => {
    const docs = path.join(process.cwd(), "docs");
    for (const name of [
      "FINAL_ARCHITECTURE_INVENTORY.md",
      "AUTHORIZATION_COVERAGE.md",
      "RLS_MATRIX.md",
    ]) {
      expect(fs.existsSync(path.join(docs, name))).toBe(true);
    }
  });
});
