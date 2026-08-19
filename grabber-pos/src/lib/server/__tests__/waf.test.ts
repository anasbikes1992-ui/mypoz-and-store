import { describe, expect, it } from "vitest";
import { inspectUrl, inspectUserAgent } from "@/lib/server/waf";

describe("WAF", () => {
  it("allows storefront and health paths", () => {
    expect(inspectUrl("/store/shopping-station").ok).toBe(true);
    expect(inspectUrl("/api/health").ok).toBe(true);
    expect(inspectUrl("/hq/tenants").ok).toBe(true);
  });

  it("blocks exploit probes", () => {
    expect(inspectUrl("/.env").ok).toBe(false);
    expect(inspectUrl("/wp-admin/").ok).toBe(false);
    expect(inspectUrl("/xmlrpc.php").ok).toBe(false);
    expect(inspectUrl("/api/../etc/passwd").ok).toBe(false);
    expect(inspectUrl("/search?q=union+select").ok).toBe(false);
  });

  it("blocks scanner user agents", () => {
    expect(inspectUserAgent("sqlmap/1.0").ok).toBe(false);
    expect(inspectUserAgent("Mozilla/5.0").ok).toBe(true);
  });
});
