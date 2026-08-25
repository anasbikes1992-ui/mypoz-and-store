import { describe, expect, it } from "vitest";
import {
  WEBXPAY_LIVE_URL,
  WEBXPAY_STAGING_URL,
  webxpayEnvironment,
  webxpayGatewayUrl,
} from "@/lib/payments/gateways/webxpay";

describe("WebXPay staging defaults", () => {
  it("defaults to staging URL when WEBXPAY_ENV unset", () => {
    const prevEnv = process.env.WEBXPAY_ENV;
    const prevUrl = process.env.WEBXPAY_GATEWAY_URL;
    delete process.env.WEBXPAY_ENV;
    delete process.env.WEBXPAY_GATEWAY_URL;
    expect(webxpayEnvironment()).toBe("staging");
    expect(webxpayGatewayUrl()).toBe(WEBXPAY_STAGING_URL);
    expect(WEBXPAY_STAGING_URL).toContain("stagingxpay.info");
    if (prevEnv !== undefined) process.env.WEBXPAY_ENV = prevEnv;
    if (prevUrl !== undefined) process.env.WEBXPAY_GATEWAY_URL = prevUrl;
  });

  it("uses live URL only when WEBXPAY_ENV=live", () => {
    const prevEnv = process.env.WEBXPAY_ENV;
    const prevUrl = process.env.WEBXPAY_GATEWAY_URL;
    delete process.env.WEBXPAY_GATEWAY_URL;
    process.env.WEBXPAY_ENV = "live";
    expect(webxpayEnvironment()).toBe("live");
    expect(webxpayGatewayUrl()).toBe(WEBXPAY_LIVE_URL);
    if (prevEnv !== undefined) process.env.WEBXPAY_ENV = prevEnv;
    else delete process.env.WEBXPAY_ENV;
    if (prevUrl !== undefined) process.env.WEBXPAY_GATEWAY_URL = prevUrl;
  });
});
