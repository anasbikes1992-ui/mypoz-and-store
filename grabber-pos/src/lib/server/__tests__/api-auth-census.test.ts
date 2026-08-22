import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Evidence census for A-P1-01: which APIs call real session helpers vs
 * relying on proxy cookie-presence alone.
 *
 * Strong: getRepository, requireGmsAdmin, requireTenantSession, getUser, …
 * Indirect: *-store / resolveDb / collections (RLS when session exists)
 *
 * Known residual (proxy + internal gate, follow-up — not empty-array regression):
 * routes that neither import strong helpers nor obvious store markers.
 */
const STRONG = [
  "getRepository",
  "requireGmsAdmin",
  "getGmsAdmin",
  "requireTenantSession",
  "createServerSupabase",
  "auth.getUser",
  "getUser(",
  "runAgentChat",
  "runHqAgent",
];

const PUBLIC_PREFIXES = [
  "store/",
  "payments/webhook/",
  "whatsapp/webhook/",
  "health/",
  "auth/login/",
  "waf-deny/",
];

/** Documented residuals — expand only when intentional; prefer adding auth. */
const KNOWN_RESIDUAL = [
  "ai/settings/route.ts",
  "audit/route.ts",
  "commerce/discounts/validate/route.ts",
  "print/route.ts",
  "products/template/route.ts",
  "products/[id]/variants/route.ts",
].sort();

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

describe("API auth census (A-P1-01)", () => {
  it("hardens email/permissions and snapshots residual proxy-only-ish routes", () => {
    const root = path.join(process.cwd(), "src/app/api");
    const routes = walk(root).map((r) =>
      r.replace(/\\/g, "/").split("src/app/api/")[1]!,
    );

    const email = fs.readFileSync(
      path.join(root, "email/send/route.ts"),
      "utf8",
    );
    const permissions = fs.readFileSync(
      path.join(root, "permissions/route.ts"),
      "utf8",
    );
    expect(email).toContain("requireTenantSession");
    expect(permissions).toContain("requireTenantSession");

    const privateWeak: string[] = [];
    for (const rel of routes) {
      if (PUBLIC_PREFIXES.some((p) => rel.startsWith(p))) continue;
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      const strong = STRONG.some((s) => text.includes(s));
      const medium =
        text.includes("resolveDb") ||
        text.includes("docStore") ||
        text.includes("getCollection") ||
        text.includes("-store") ||
        text.includes("readSettings") ||
        text.includes("writeSettings") ||
        text.includes("listCollection") ||
        text.includes("createEntity") ||
        text.includes("backup") ||
        text.includes("exportProducts") ||
        text.includes("printReceipt");
      if (!strong && !medium) privateWeak.push(rel);
    }

    expect([...privateWeak].sort()).toEqual(KNOWN_RESIDUAL);
  });
});
