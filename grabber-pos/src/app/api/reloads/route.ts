import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSale } from "@/lib/server/sales-repo";
import { listReloads, logReload } from "@/lib/server/reload-store";
import { readSettings } from "@/lib/server/settings-store";
import { parseCsvList } from "@/lib/hp-math";

const schema = z.object({
  provider: z.string().min(1, "Provider is required").max(60),
  mobile: z.string().min(1, "Mobile is required").max(20),
  amount: z.coerce.number().positive("Amount must be positive"),
});

export async function GET() {
  const settings = await readSettings();
  const providers = parseCsvList(settings.reloadProviders);
  const reloads = await listReloads();
  return NextResponse.json({
    success: true,
    data: { reloads, providers },
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  const { provider, mobile, amount } = parsed.data;

  const sale = await createSale({
    lines: [
      {
        productId: "",
        name: `Reload: ${provider} ${mobile}`,
        unitPrice: amount,
        quantity: 1,
        discount: 0,
        lineTotal: amount,
      },
    ],
    subtotal: amount,
    discountTotal: 0,
    finalDiscount: 0,
    serviceCharge: 0,
    total: amount,
    paymentMethod: "cash",
    isWholesale: false,
    customerName: null,
    customerMobile: mobile,
    employee: null,
    cashReceived: amount,
    change: 0,
  });
  await logReload({ provider, mobile, amount, saleId: sale.id });

  return NextResponse.json({ success: true, data: sale, error: null });
}
