import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { generateTempPassword } from "@/lib/server/hq-password";

describe("hq password helpers", () => {
  it("generates a usable temporary password", () => {
    const a = generateTempPassword();
    const b = generateTempPassword();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(b.length).toBeGreaterThanOrEqual(8);
    expect(a).not.toBe(b);
  });
});
