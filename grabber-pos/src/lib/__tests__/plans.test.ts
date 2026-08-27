import { describe, it, expect } from "vitest";
import {
  planEnabledKeys,
  isLicenseExpired,
  STARTER_KEYS,
  VERTICAL_KEYS,
} from "../plans";

const ALL = [
  ...STARTER_KEYS,
  ...VERTICAL_KEYS,
  "employees",
  "suppliers",
  "quotations",
];

describe("planEnabledKeys", () => {
  it("unlocks everything on enterprise except quarantined verticals", () => {
    const keys = planEnabledKeys("enterprise", ALL);
    expect(keys.has("restaurant")).toBe(true);
    expect(keys.has("rooms")).toBe(false);
    expect(keys.has("repair")).toBe(false);
    expect(keys.has("hire")).toBe(false);
  });

  it("excludes sale-mode verticals on business", () => {
    const keys = planEnabledKeys("business", ALL);
    expect(keys.has("restaurant")).toBe(false);
    expect(keys.has("rooms")).toBe(false);
    // Management modules stay available.
    expect(keys.has("employees")).toBe(true);
    expect(keys.has("quotations")).toBe(true);
  });

  it("limits starter to the core set", () => {
    const keys = planEnabledKeys("starter", ALL);
    expect(keys.has("retail")).toBe(true);
    expect(keys.has("products")).toBe(true);
    expect(keys.has("employees")).toBe(false);
    expect(keys.has("restaurant")).toBe(false);
  });

  it("keeps the reseller console reachable on every plan", () => {
    for (const plan of ["starter", "business", "enterprise"] as const) {
      const keys = planEnabledKeys(plan, ALL);
      expect(keys.has("admin")).toBe(true);
      expect(keys.has("clients")).toBe(true);
    }
  });

  it("adds per-client extras on top of the plan", () => {
    const keys = planEnabledKeys("starter", ALL, ["restaurant"]);
    expect(keys.has("restaurant")).toBe(true);
    expect(keys.has("kds")).toBe(true);
    expect(keys.has("tables")).toBe(true);
    // Extras don't unlock unrelated verticals.
    expect(keys.has("rooms")).toBe(false);
  });

  it("bundles delivery drivers with the delivery extra", () => {
    const keys = planEnabledKeys("business", ALL, ["delivery"]);
    expect(keys.has("delivery")).toBe(true);
    expect(keys.has("drivers")).toBe(true);
    expect(keys.has("restaurant")).toBe(false);
  });

  it("adds knowledge module on business without verticals", () => {
    const withKb = [...STARTER_KEYS, ...VERTICAL_KEYS, "knowledge", "employees"];
    const biz = planEnabledKeys("business", withKb);
    expect(biz.has("knowledge")).toBe(true);
    expect(biz.has("restaurant")).toBe(false);
    const starter = planEnabledKeys("starter", withKb);
    expect(starter.has("knowledge")).toBe(false);
    expect(
      planEnabledKeys("starter", withKb, ["knowledge"]).has("knowledge"),
    ).toBe(true);
  });
});

describe("isLicenseExpired", () => {
  it("treats a blank expiry as perpetual", () => {
    expect(isLicenseExpired("")).toBe(false);
  });

  it("detects a past expiry", () => {
    expect(isLicenseExpired("2020-01-01")).toBe(true);
  });

  it("accepts a future expiry", () => {
    expect(isLicenseExpired("2999-01-01")).toBe(false);
  });

  it("ignores an unparseable expiry rather than locking the client out", () => {
    expect(isLicenseExpired("not-a-date")).toBe(false);
  });
});
