import { describe, expect, it } from "vitest";
import { detectRageClick } from "@/lib/observability";

describe("rage click", () => {
  it("flags three clicks on the same target within 800ms as UX failure", () => {
    const now = 10_000;
    expect(detectRageClick([now - 200, now - 100, now], now)).toBe(true);
  });

  it("ignores spaced clicks", () => {
    const now = 10_000;
    expect(detectRageClick([now - 2000, now - 1000, now], now)).toBe(false);
  });
});
