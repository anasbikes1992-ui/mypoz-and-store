import { describe, expect, it } from "vitest";
import { cnamePointsAtVercel, normalizeHost } from "@/lib/commerce/domain-dns";

describe("domain DNS helpers", () => {
  it("strips protocol and path", () => {
    expect(normalizeHost("https://Shop.Example.lk/path")).toBe("shop.example.lk");
  });

  it("accepts Vercel CNAME targets", () => {
    expect(cnamePointsAtVercel(["cname.vercel-dns.com."])).toBe(true);
    expect(cnamePointsAtVercel(["mypoz-and-store-ui.vercel.app"])).toBe(true);
    expect(cnamePointsAtVercel(["mypoz-and-store.vercel.app"])).toBe(true);
    expect(cnamePointsAtVercel(["example.com"])).toBe(false);
  });
});
