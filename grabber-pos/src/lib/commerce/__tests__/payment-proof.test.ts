import { describe, expect, it } from "vitest";
import {
  initialPaymentProofStatus,
  isValidPaymentProofUrl,
  PAYMENT_PROOF_MAX_CHARS,
} from "@/lib/commerce/payment-proof";

describe("payment proof URL", () => {
  it("accepts https URLs", () => {
    expect(isValidPaymentProofUrl("https://cdn.example.com/slip.jpg")).toBe(true);
  });

  it("accepts image data URLs", () => {
    expect(
      isValidPaymentProofUrl("data:image/png;base64,iVBORw0KGgo="),
    ).toBe(true);
    expect(
      isValidPaymentProofUrl("data:image/jpeg;base64,/9j/4AAQ"),
    ).toBe(true);
  });

  it("rejects non-image data URLs and oversized strings", () => {
    expect(isValidPaymentProofUrl("data:application/pdf;base64,AAA")).toBe(false);
    expect(isValidPaymentProofUrl("http://insecure.example/slip.jpg")).toBe(false);
    expect(isValidPaymentProofUrl("data:image/png;base64," + "a".repeat(PAYMENT_PROOF_MAX_CHARS))).toBe(
      false,
    );
  });

  it("stamps submitted only when bank_transfer has a proof", () => {
    expect(initialPaymentProofStatus("cash")).toBeUndefined();
    expect(initialPaymentProofStatus("bank_transfer")).toBe("none");
    expect(
      initialPaymentProofStatus("bank_transfer", "https://cdn.example.com/s.png"),
    ).toBe("submitted");
  });
});
