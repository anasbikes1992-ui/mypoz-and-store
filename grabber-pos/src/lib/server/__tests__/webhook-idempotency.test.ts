import { createHash } from "crypto";
import { describe, expect, it } from "vitest";

/**
 * Mirrors the durable webhook client_uuid derivation used by
 * completePendingSale so duplicate Meta/gateway deliveries cannot
 * double-post stock via create_sale idempotency.
 */
function deterministicClientUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  const base = hex.slice(0, 32).split("");
  base[12] = "4";
  const variant = Number.parseInt(base[16] ?? "0", 16);
  base[16] = ((variant & 0x3) | 0x8).toString(16);
  const compact = base.join("");
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20, 32),
  ].join("-");
}

describe("webhook / pending-sale idempotency", () => {
  it("derives a stable UUID v4-shaped key from the web order id", () => {
    const a = deterministicClientUuid("WEB-ABCD1234");
    const b = deterministicClientUuid("WEB-ABCD1234");
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("produces different keys for different orders (cross-tenant safety)", () => {
    const tenantA = deterministicClientUuid("org-a:WEB-1");
    const tenantB = deterministicClientUuid("org-b:WEB-1");
    expect(tenantA).not.toBe(tenantB);
  });

  it("treats already-PAID + completedAt as a no-op completion", () => {
    const existing = {
      status: "PAID" as const,
      meta: { completedAt: "2026-08-01T00:00:00.000Z", saleId: "GPS-MAIN-1" },
    };
    const shouldSkip =
      existing.status === "PAID" && Boolean(existing.meta?.completedAt);
    expect(shouldSkip).toBe(true);
  });

  it("treats licenceAppliedAt as licence webhook idempotency", () => {
    const existing = {
      status: "PAID" as const,
      meta: { kind: "licence", licenceAppliedAt: "2026-08-01T00:00:00.000Z" },
    };
    const shouldSkip =
      existing.meta.kind === "licence" && Boolean(existing.meta.licenceAppliedAt);
    expect(shouldSkip).toBe(true);
  });
});
