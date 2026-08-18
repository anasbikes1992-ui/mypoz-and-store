import type { CheckoutInput, CheckoutResult, PaymentAdapter, WebhookResult } from "./types";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe via HTTPS API (no `stripe` npm dependency required).
 * Fail-closed webhook uses Stripe-Signature header reconstruction.
 */
function e(k: string) {
  return process.env[k];
}

export const stripeAdapter: PaymentAdapter = {
  key: "STRIPE",
  currencies: ["USD"],
  configured: () => Boolean(e("STRIPE_SECRET_KEY")),

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const key = e("STRIPE_SECRET_KEY");
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("client_reference_id", input.reference);
    params.set("customer_email", input.customer.email);
    params.set("success_url", `${input.returnUrl}?ref=${encodeURIComponent(input.reference)}`);
    params.set("cancel_url", input.cancelUrl);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    params.set("line_items[0][price_data][unit_amount]", String(input.amountMinor));
    params.set("line_items[0][price_data][product_data][name]", input.description);
    params.set("metadata[reference]", input.reference);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const json = (await res.json()) as { url?: string; error?: { message?: string } };
    if (!res.ok || !json.url) {
      throw new Error(json.error?.message ?? "Stripe checkout session failed");
    }
    return { mode: "redirect", url: json.url };
  },

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookResult | null> {
    const secret = e("STRIPE_WEBHOOK_SECRET");
    const sigHeader = headers.get("stripe-signature");
    if (!secret || !sigHeader) return null;

    if (!verifyStripeSignature(rawBody, sigHeader, secret)) return null;

    let event: {
      type?: string;
      data?: {
        object?: {
          id?: string;
          client_reference_id?: string | null;
          metadata?: { reference?: string };
          payment_status?: string;
          amount_total?: number | null;
          currency?: string | null;
        };
      };
    };
    try {
      event = JSON.parse(rawBody);
    } catch {
      return null;
    }

    const s = event.data?.object;
    if (!s) return null;
    const reference = s.client_reference_id ?? s.metadata?.reference;
    if (!reference) return null;

    if (event.type === "checkout.session.completed") {
      return {
        reference,
        providerRef: s.id,
        status: s.payment_status === "paid" ? "PAID" : "PENDING",
        verified: true,
        amountMinor: s.amount_total ?? undefined,
        currency: (s.currency?.toUpperCase() as WebhookResult["currency"]) ?? undefined,
      };
    }
    if (event.type === "checkout.session.expired") {
      return { reference, providerRef: s.id, status: "CANCELLED", verified: true };
    }
    return null;
  },
};

function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k.trim(), v];
    }),
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(v1);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
