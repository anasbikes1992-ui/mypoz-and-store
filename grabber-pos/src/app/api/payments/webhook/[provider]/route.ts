import { NextRequest, NextResponse } from "next/server";
import { getAdapter, PROVIDER_KEYS, type ProviderKey } from "@/lib/payments/gateways";
import { applyGatewayWebhook } from "@/lib/server/gateway-payments-store";

/**
 * Gateway webhook — fail-closed. Unverified signatures never mark paid.
 * Register: {APP_URL}/api/payments/webhook/PAYHERE (etc.)
 * Persists status onto the gateway-payments ledger created at checkout.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await params;
  const provider = raw.toUpperCase() as ProviderKey;
  if (!PROVIDER_KEYS.includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const adapter = getAdapter(provider);
  if (!adapter) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const rawBody = await req.text();
  const result = await adapter.verifyWebhook(req.headers, rawBody);
  if (!result) {
    console.warn(`[payments] unparseable ${provider} webhook`);
    return NextResponse.json({ error: "Unparseable" }, { status: 400 });
  }

  if (!result.verified) {
    console.error(
      `[payments] UNVERIFIED ${provider} for ref=${result.reference} status=${result.status} — ignored`,
    );
    return NextResponse.json({ received: true, verified: false }, { status: 202 });
  }

  const applied = await applyGatewayWebhook({
    reference: result.reference,
    status: result.status,
    providerRef: result.providerRef,
    amountMinor: result.amountMinor,
  });

  if (!applied.ok) {
    console.warn(`[payments] ${provider} apply failed: ${applied.reason} ref=${result.reference}`);
    const status = applied.reason === "NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: applied.reason }, { status });
  }

  console.info(
    `[payments] verified ${provider} ref=${result.reference} status=${result.status} providerRef=${result.providerRef ?? ""}`,
  );

  return NextResponse.json({
    received: true,
    verified: true,
    status: result.status,
    reference: result.reference,
  });
}
