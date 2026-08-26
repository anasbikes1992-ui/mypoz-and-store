import { NextResponse } from "next/server";
import { anyGatewayConfigured, pickProvider } from "@/lib/payments/gateways";
import {
  webxpayConfigured,
  webxpayEnvironment,
  webxpayGatewayUrl,
} from "@/lib/payments/gateways/webxpay";
import { rateLimitBackend } from "@/lib/server/rate-limit";

/**
 * Non-secret payment / ops readiness probe for staging checks.
 * Does not expose keys.
 */
export async function GET() {
  const lkr = pickProvider("LKR");
  return NextResponse.json({
    success: true,
    data: {
      anyConfigured: anyGatewayConfigured(),
      lkrProvider: lkr,
      rateLimit: rateLimitBackend(),
      email: {
        configured: Boolean(process.env.RESEND_API_KEY?.trim()),
        fromSet: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
      },
      webxpay: {
        configured: webxpayConfigured(),
        environment: webxpayEnvironment(),
        gatewayHost: (() => {
          try {
            return new URL(webxpayGatewayUrl()).host;
          } catch {
            return null;
          }
        })(),
        returnUrlHint: "/api/payments/webhook/WEBXPAY",
        docs: "https://developers.webxpay.com/Guides/Redirect-Integration/redirect.html",
        stagingUrl: "https://stagingxpay.info/index.php?route=checkout/billing",
        liveUrl: "https://webxpay.com/index.php?route=checkout/billing",
        missingEnv: [
          !process.env.WEBXPAY_PUBLIC_KEY?.trim() && "WEBXPAY_PUBLIC_KEY",
          !process.env.WEBXPAY_SECRET_KEY?.trim() && "WEBXPAY_SECRET_KEY",
        ].filter(Boolean),
      },
    },
    error: null,
  });
}
