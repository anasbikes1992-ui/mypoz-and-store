import { NextRequest, NextResponse } from "next/server";
import {
  getSession,
  removeSession,
  sessionCharge,
} from "@/lib/server/play-store";
import { createSale } from "@/lib/server/sales-repo";

/** Check out: bill elapsed time × rate as a sale and end the session. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) {
    return NextResponse.json(
      { success: false, data: null, error: "Session not found" },
      { status: 404 },
    );
  }

  const { minutes, charge } = sessionCharge(session);
  const hoursLabel = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  const sale = await createSale({
    lines: [
      {
        productId: "",
        name: `Play: ${session.name} (${hoursLabel})`,
        unitPrice: charge,
        quantity: 1,
        discount: 0,
        lineTotal: charge,
      },
    ],
    subtotal: charge,
    discountTotal: 0,
    finalDiscount: 0,
    serviceCharge: 0,
    total: charge,
    paymentMethod: "cash",
    isWholesale: false,
    customerName: session.name,
    customerMobile: null,
    employee: null,
    cashReceived: charge,
    change: 0,
  });
  await removeSession(id);
  return NextResponse.json({
    success: true,
    data: { sale, minutes, charge },
    error: null,
  });
}
