import { describe, expect, it } from "vitest";
import { createHash } from "crypto";
import { payhereAdapter } from "@/lib/payments/gateways/payhere";
import { md5Hex, safeEqual } from "@/lib/payments/gateways/sig";

describe("PayHere adapter", () => {
  it("md5Hex is stable", () => {
    expect(md5Hex("abc")).toBe(createHash("md5").update("abc").digest("hex"));
  });

  it("safeEqual rejects length mismatch", () => {
    expect(safeEqual("aa", "a")).toBe(false);
    expect(safeEqual("ab", "ab")).toBe(true);
  });

  it("configured() reflects env", () => {
    const before = payhereAdapter.configured();
    expect(typeof before).toBe("boolean");
  });

  it("verifyWebhook rejects bad signature", async () => {
    process.env.PAYHERE_MERCHANT_SECRET = "test-secret";
    const body = new URLSearchParams({
      merchant_id: "121XXXX",
      order_id: "ORD1",
      payhere_amount: "100.00",
      payhere_currency: "LKR",
      status_code: "2",
      md5sig: "DEADBEEF",
    }).toString();
    const result = await payhereAdapter.verifyWebhook(new Headers(), body);
    expect(result).not.toBeNull();
    expect(result!.verified).toBe(false);
  });

  it("verifyWebhook accepts valid signature", async () => {
    const merchantId = "121XXXX";
    const secret = "test-secret";
    const reference = "ORD2";
    const amount = "250.00";
    const currency = "LKR";
    const statusCode = "2";
    process.env.PAYHERE_MERCHANT_SECRET = secret;
    const secretHash = md5Hex(secret).toUpperCase();
    const md5sig = md5Hex(
      `${merchantId}${reference}${amount}${currency}${statusCode}${secretHash}`,
    ).toUpperCase();
    const body = new URLSearchParams({
      merchant_id: merchantId,
      order_id: reference,
      payhere_amount: amount,
      payhere_currency: currency,
      status_code: statusCode,
      md5sig,
    }).toString();
    const result = await payhereAdapter.verifyWebhook(new Headers(), body);
    expect(result?.verified).toBe(true);
    expect(result?.status).toBe("PAID");
    expect(result?.reference).toBe(reference);
  });
});
