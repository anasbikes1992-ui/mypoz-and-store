import { describe, expect, it } from "vitest";
import { whatsAppLink, whatsAppOrderText } from "@/lib/storefront";

describe("WhatsApp cart handoff", () => {
  it("builds wa.me link with encoded order text", () => {
    const text = whatsAppOrderText(
      "Anaz Store",
      [{ name: "Shirt", quantity: 1, price: 4500 }],
      4500,
      "LKR",
      { name: "Amal", mobile: "0771234567", address: "Colombo", fulfilment: "courier" },
    );
    expect(text).toContain("Anaz Store");
    expect(text).toContain("Shirt");
    expect(text).toContain("Amal");
    expect(text).toContain("Order via WhatsApp");
    const href = whatsAppLink("94771234567", text);
    expect(href).toMatch(/^https:\/\/wa\.me\/94771234567\?text=/);
  });

  it("returns null without a usable number", () => {
    expect(whatsAppLink(null, "hi")).toBeNull();
    expect(whatsAppLink("12", "hi")).toBeNull();
  });
});
