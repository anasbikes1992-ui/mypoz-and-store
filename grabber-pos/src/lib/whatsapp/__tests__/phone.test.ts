import { describe, expect, it } from "vitest";
import { isLkPhone, normalizeLkPhone } from "../phone";

describe("normalizeLkPhone", () => {
  it("accepts local 07 numbers", () => {
    expect(normalizeLkPhone("0771234567")).toBe("+94771234567");
  });

  it("accepts E.164 and 94 prefixes", () => {
    expect(normalizeLkPhone("+94771234567")).toBe("+94771234567");
    expect(normalizeLkPhone("94771234567")).toBe("+94771234567");
    expect(normalizeLkPhone("0094771234567")).toBe("+94771234567");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeLkPhone("0112345678")).toBeNull();
    expect(normalizeLkPhone("hello")).toBeNull();
    expect(isLkPhone("0771234567")).toBe(true);
  });

  it("optionalLkWhatsAppContact rejects email autofill", async () => {
    const { optionalLkWhatsAppContact } = await import("../phone");
    expect(optionalLkWhatsAppContact.safeParse("anazazeez1992@gmail.com").success).toBe(
      false,
    );
    expect(optionalLkWhatsAppContact.parse("0779592288")).toBe("+94779592288");
    expect(optionalLkWhatsAppContact.parse("")).toBe("");
  });
});
