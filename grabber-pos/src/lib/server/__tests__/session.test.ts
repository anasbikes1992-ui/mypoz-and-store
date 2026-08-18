import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { sessionToken, verifySessionToken, isDefaultSessionSecret } = await import(
  "@/lib/server/session"
);

describe("demo session tokens", () => {
  it("round-trips HMAC verification", () => {
    process.env.POS_SESSION_SECRET = "unit-test-secret";
    const tok = sessionToken("admin");
    expect(verifySessionToken(tok)).toBe(true);
    expect(verifySessionToken("admin.forged")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });

  it("detects default secret", () => {
    delete process.env.POS_SESSION_SECRET;
    expect(isDefaultSessionSecret()).toBe(true);
    process.env.POS_SESSION_SECRET = "custom";
    expect(isDefaultSessionSecret()).toBe(false);
  });
});
