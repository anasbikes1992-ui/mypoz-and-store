import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  hashManagerPin,
  isHashedManagerPin,
  verifyManagerPinValue,
} from "../manager-pin";

describe("manager-pin", () => {
  it("hashes and verifies a PIN", () => {
    const hashed = hashManagerPin("4829");
    expect(isHashedManagerPin(hashed)).toBe(true);
    expect(verifyManagerPinValue("4829", hashed)).toBe(true);
    expect(verifyManagerPinValue("0000", hashed)).toBe(false);
  });

  it("rejects empty stored PIN (not configured)", () => {
    expect(verifyManagerPinValue("1234", "")).toBe(false);
    expect(verifyManagerPinValue("1234", null)).toBe(false);
  });

  it("still verifies legacy plaintext until upgraded", () => {
    expect(verifyManagerPinValue("9999", "9999")).toBe(true);
    expect(verifyManagerPinValue("9998", "9999")).toBe(false);
  });

  it("does not accept a default 1234 when nothing is stored", () => {
    expect(verifyManagerPinValue("1234", undefined)).toBe(false);
  });
});
