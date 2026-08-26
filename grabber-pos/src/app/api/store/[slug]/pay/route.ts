import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdapter, pickProvider, type ProviderKey } from "@/lib/payments/gateways";
import { createGatewayPayment } from "@/lib/server/gateway-payments-store";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";

const Schema = z.object({
  reference: z.string().min(2).max(120),
  amountMinor: z.number().int().positive(),
  currency: z.enum(["LKR", "USD"]).default("LKR"),
  description: z.string().min(1).max(200),
  saleId: z.string().min(1).max(120).optional(),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email().or(z.literal("")).optional(),
    phone: z.string().optional(),
  }),
  provider: z.enum(["WEBXPAY", "PAYHERE", "ONEPAY", "LANKAPAY", "STRIPE"]).optional(),
});

/**
 * Start checkout using THIS app's gateway processors (src/lib/payments/gateways).
 * Keys come from MyPoz .env — not grabber-shared.
 * Persists a PENDING gateway-payment row so webhooks can mark PAID.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const host = req.headers.get("host");
  if (!(await getStorefrontInfo({ host, slug }))) {
    return NextResponse.json(
      { success: false, data: null, error: "Storefront unavailable" },
      { status: 404 },
    );
  }

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
  const provider = pickProvider(input.currency, input.provider as ProviderKey | undefined);
  if (!provider) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No payment gateway configured. Set WEBXPAY_*/PAYHERE_*/ONEPAY_*/LANKAPAY_*/STRIPE_* in this app's .env",
      },
      { status: 503 },
    );
  }

  const adapter = getAdapter(provider)!;
  const origin = req.nextUrl.origin;
  const email =
    input.customer.email && input.customer.email.includes("@")
      ? input.customer.email
      : "storefront@grabber.local";

  try {
    await createGatewayPayment({
      reference: input.reference,
      provider,
      currency: input.currency,
      amountMinor: input.amountMinor,
      slug,
      description: input.description,
      customerName: input.customer.name,
      customerEmail: email,
      meta: {
        saleId: input.saleId ?? input.reference,
        slug,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Could not create payment record",
      },
      { status: 503 },
    );
  }

  try {
    const checkout = await adapter.createCheckout({
      reference: input.reference,
      amountMinor: input.amountMinor,
      currency: input.currency,
      description: input.description,
      customer: {
        name: input.customer.name,
        email,
        phone: input.customer.phone,
      },
      returnUrl: `${origin}/store/${slug}/pay/success?ref=${encodeURIComponent(input.reference)}`,
      cancelUrl: `${origin}/store/${slug}/pay/cancel?ref=${encodeURIComponent(input.reference)}`,
    });
    return NextResponse.json({ success: true, data: { provider, ...checkout }, error: null });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
