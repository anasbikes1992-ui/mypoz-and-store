import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";
import { PLAN_BLURBS, PLAN_PRICES_LKR } from "@/lib/billing";
import { readTenant } from "@/lib/server/tenant-store";
import { createHqTicket } from "@/lib/server/hq-repo";
import { readSettings } from "@/lib/server/settings-store";
import { payhereAdapter } from "@/lib/payments/gateways/payhere";
import { createGatewayPayment } from "@/lib/server/gateway-payments-store";
import {
  licenceAmountLkr,
  recordLicenceInvoice,
} from "@/lib/server/licence-payment";

const upgradeSchema = z.object({
  plan: z.enum(["starter", "business", "enterprise"]),
  note: z.string().max(500).optional(),
  method: z.enum(["request", "invoice", "payhere"]).default("request"),
});

export async function GET() {
  const tenant = await readTenant();
  const plans = (Object.keys(PLAN_PRICES_LKR) as PlanTier[]).map((id) => ({
    id,
    name: PLAN_NAMES[id],
    priceLkr: PLAN_PRICES_LKR[id],
    blurb: PLAN_BLURBS[id],
    current: tenant.license.plan === id,
  }));
  return NextResponse.json({
    success: true,
    data: {
      license: tenant.license,
      brand: tenant.brand,
      plans,
      payhere: payhereAdapter.configured(),
    },
    error: null,
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = upgradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Choose a plan" },
      { status: 400 },
    );
  }
  const tenant = await readTenant();
  const settings = await readSettings();
  const plan = parsed.data.plan;
  const amountLkr = licenceAmountLkr(plan);
  const tenantName = tenant.brand.businessName || "Tenant";

  if (parsed.data.method === "invoice") {
    const invoice = await recordLicenceInvoice({
      plan,
      amountLkr,
      tenantName,
    });
    return NextResponse.json({
      success: true,
      data: { ...invoice, plan, method: "invoice" },
      error: null,
    });
  }

  if (parsed.data.method === "payhere") {
    if (!payhereAdapter.configured()) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: "PayHere is not configured. Use invoice + HQ confirm, or set PAYHERE_MERCHANT_ID/SECRET.",
        },
        { status: 422 },
      );
    }
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "";
    const reference = `LIC-${Date.now().toString(36).toUpperCase()}`;
    const slug = settings.storeSlug || "main-store";
    await createGatewayPayment({
      reference,
      provider: "PAYHERE",
      currency: "LKR",
      amountMinor: Math.round(amountLkr * 100),
      slug,
      description: `MyPoz ${PLAN_NAMES[plan]} licence`,
      customerName: tenantName,
      customerEmail: settings.email || "billing@mypoz.local",
      meta: { kind: "licence", plan },
    });
    const checkout = await payhereAdapter.createCheckout({
      reference,
      amountMinor: Math.round(amountLkr * 100),
      currency: "LKR",
      description: `MyPoz ${PLAN_NAMES[plan]} licence`,
      customer: {
        name: tenantName,
        email: settings.email || "billing@mypoz.local",
        phone: settings.phone || undefined,
      },
      returnUrl: `${origin}/billing?paid=1`,
      cancelUrl: `${origin}/billing?cancelled=1`,
    });
    return NextResponse.json({
      success: true,
      data: { method: "payhere", plan, checkout, reference },
      error: null,
    });
  }

  const ticket = await createHqTicket({
    subject: `Billing: request ${PLAN_NAMES[plan]}`,
    body: [
      `Current plan: ${tenant.license.plan}`,
      `Requested: ${plan}`,
      `Expiry: ${tenant.license.expiry || "none"}`,
      parsed.data.note || "",
    ].join("\n"),
    tenantId: tenantName,
    tenantName,
    priority: "normal",
  });
  return NextResponse.json({
    success: true,
    data: { ticketId: ticket.id, plan, method: "request" },
    error: null,
  });
}
