import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, resetRateLimitState } from "@/lib/server/rate-limit";

describe("adaptive rate limit", () => {
  beforeEach(() => {
    resetRateLimitState();
  });

  it("allows traffic under the window cap", () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("t1", 10, 10_000).limited).toBe(false);
    }
  });

  it("returns 429 then a temporary ban after repeated strikes", () => {
    const first = rateLimit("t2", 1, 10_000);
    expect(first.limited).toBe(false);
    expect(rateLimit("t2", 1, 10_000).limited).toBe(true);
    expect(rateLimit("t2", 1, 10_000).limited).toBe(true);
    const banned = rateLimit("t2", 1, 10_000);
    expect(banned.limited).toBe(true);
    if (banned.limited) {
      expect(banned.banned).toBe(true);
      expect(banned.retryAfterSec).toBeGreaterThan(60);
    }
  });
});
