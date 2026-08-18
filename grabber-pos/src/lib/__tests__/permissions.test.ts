import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  resolvePermission,
  type PermissionKey,
} from "../permissions";

const roleDefaults: Record<string, PermissionKey[]> = {
  cashier: [],
  manager: ["void_sale", "price_override"],
  admin: ["void_sale", "price_override", "manage_users"],
};

describe("normalizeRole", () => {
  it("maps owner to admin", () => {
    expect(normalizeRole("owner")).toBe("admin");
  });

  it("defaults unknown to cashier", () => {
    expect(normalizeRole("")).toBe("cashier");
    expect(normalizeRole(undefined)).toBe("cashier");
  });
});

describe("resolvePermission", () => {
  it("uses role defaults when no override", () => {
    expect(
      resolvePermission(
        { roleDefaults },
        "void_sale",
        { role: "manager" },
      ),
    ).toBe(true);
    expect(
      resolvePermission(
        { roleDefaults },
        "void_sale",
        { role: "cashier" },
      ),
    ).toBe(false);
  });

  it("user allow overrides role deny", () => {
    expect(
      resolvePermission(
        {
          roleDefaults,
          userOverrides: { u1: { void_sale: true } },
        },
        "void_sale",
        { userId: "u1", role: "cashier" },
      ),
    ).toBe(true);
  });

  it("user deny overrides role allow", () => {
    expect(
      resolvePermission(
        {
          roleDefaults,
          userOverrides: { u1: { void_sale: false } },
        },
        "void_sale",
        { userId: "u1", role: "manager" },
      ),
    ).toBe(false);
  });

  it("falls through when override key absent", () => {
    expect(
      resolvePermission(
        {
          roleDefaults,
          userOverrides: { u1: { price_override: true } },
        },
        "void_sale",
        { userId: "u1", role: "manager" },
      ),
    ).toBe(true);
  });
});
