import { describe, expect, it } from "vitest";
import { expandPackage } from "@/lib/packages";

describe("expandPackage", () => {
  const catalog: Record<string, { name: string; salePrice: number }> = {
    P1: { name: "Widget", salePrice: 100 },
    P2: { name: "Gadget", salePrice: 300 },
    P0: { name: "Freebie", salePrice: 0 },
  };
  const lookup = (id: string) => catalog[id] ?? null;

  it("expands a single-item pack with pack unit price", () => {
    const r = expandPackage(
      { name: "Twin pack", price: 180, productId: "P1", qty: 2 },
      lookup,
    );
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].productId).toBe("P1");
    expect(r.lines[0].quantity).toBe(2);
    expect(r.lines[0].unitPrice * r.lines[0].quantity).toBeCloseTo(180, 2);
  });

  it("distributes multi-item pack price by catalog weight", () => {
    const r = expandPackage(
      {
        name: "Combo",
        price: 320,
        items: [
          { productId: "P1", qty: 1 },
          { productId: "P2", qty: 1 },
        ],
      },
      lookup,
    );
    expect(r.lines).toHaveLength(2);
    const total = r.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    expect(total).toBeCloseTo(320, 2);
    // P2 is 3× P1 catalog → ~75% of pack
    expect(r.lines[1].unitPrice).toBeGreaterThan(r.lines[0].unitPrice);
  });

  it("throws when product is missing", () => {
    expect(() =>
      expandPackage({ name: "X", price: 10, productId: "MISSING", qty: 1 }, lookup),
    ).toThrow(/Unknown product/);
  });

  it("throws when pack has no items", () => {
    expect(() => expandPackage({ name: "Empty", price: 10 }, lookup)).toThrow(
      /no items/,
    );
  });
});
