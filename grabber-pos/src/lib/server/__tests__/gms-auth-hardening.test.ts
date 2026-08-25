import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("GMS HQ auth hardening", () => {
  it("does not trust client-writable user_metadata for gms_admin", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/gms-auth.ts"),
      "utf8",
    );
    expect(src).toContain("app_metadata");
    expect(src).not.toMatch(/hasGmsMetadata\(user\.user_metadata/);
    expect(src).toMatch(
      /hasGmsMetadata\(user\.app_metadata as Record<string, unknown>\)/,
    );
  });

  it("requires allowlist or server-controlled app_metadata (empty allowlist closed)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/gms-auth.ts"),
      "utf8",
    );
    expect(src).toContain("allow.length === 0 ? false");
    expect(src).toContain("if (!metaOk && !emailOk) return null");
  });
});
