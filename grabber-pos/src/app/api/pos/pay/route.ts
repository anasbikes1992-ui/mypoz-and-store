import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantSession } from "@/lib/server/auth-session";
import { getAdapter, pickProvider } from "@/lib/payments/gateways";
import { createGatewayPayment } from "@/lib/server/gateway-payments-store";

const Schema = z.object({
  reference: z.string().min(2).max(120),
  amountMinor: z.number().int().positive(),
  currency: z.enum(["LKR", "USD"]).default("LKR"),
  description: z.string().min(1).max(200).optional(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().or(z.literal("")).optional(),
    phone: z.string().optional(),
  }),
});

/**
 * POS card checkout — attaches a payment_intent (already created as pending sale)
 * to WebXPay (staging by default) and returns an auto-submit form payload.
 * Stock is NOT decremented until webhook marks PAID.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 422 },
    );
  }

  const input = parsed.data;
  const provider = pickProvider(input.currency);
  if (!provider) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Card gateway not configured. Set WEBXPAY_PUBLIC_KEY and WEBXPAY_SECRET_KEY (staging) in env.",
      },
      { status: 503 },
    );
  }

  const adapter = getAdapter(provider)!;
  const email =
    input.customer.email && input.customer.email.includes("@")
      ? input.customer.email
      : `${auth.session.userId.slice(0, 8)}@pos.mypoz.local`;

  try {
    await createGatewayPayment({
      reference: input.reference,
      provider,
      currency: input.currency,
      amountMinor: input.amountMinor,
      orgId: auth.session.orgId,
      description: input.description ?? `POS ${input.reference}`,
      customerName: input.customer.name,
      customerEmail: email,
      source: "pos",
      clientUuid: undefined,
      meta: {
        kind: "pos_sale",
        saleId: input.reference,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Could not create payment intent",
      },
      { status: 503 },
    );
  }

  const origin = req.nextUrl.origin;
  try {
    const checkout = await adapter.createCheckout({
      reference: input.reference,
      amountMinor: input.amountMinor,
      currency: input.currency,
      description: input.description ?? `POS ${input.reference}`,
      customer: {
        name: input.customer.name,
        email,
        phone: input.customer.phone,
      },
      returnUrl: `${origin}/pos?pay=success&ref=${encodeURIComponent(input.reference)}`,
      cancelUrl: `${origin}/pos?pay=cancel&ref=${encodeURIComponent(input.reference)}`,
    });
    return NextResponse.json({
      success: true,
      data: { provider, ...checkout },
      error: null,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
