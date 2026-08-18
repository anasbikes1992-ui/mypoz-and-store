import { NextRequest, NextResponse } from "next/server";
import { getEntity, updateEntity } from "@/lib/server/collection-store";

/**
 * Adjust a customer's loyalty points after a sale.
 * Body: { customerId, earn, redeem }. Points move by (earn - redeem),
 * floored at zero. Only the points field is touched.
 */
export async function POST(req: NextRequest) {
  let body: { customerId?: string; earn?: number; redeem?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { customerId } = body;
  const earn = Math.max(0, Math.floor(Number(body.earn) || 0));
  const redeem = Math.max(0, Math.floor(Number(body.redeem) || 0));
  if (!customerId) {
    return NextResponse.json(
      { success: false, data: null, error: "customerId is required" },
      { status: 400 },
    );
  }

  const customer = await getEntity("customers", customerId);
  if (!customer) {
    return NextResponse.json(
      { success: false, data: null, error: "Customer not found" },
      { status: 404 },
    );
  }

  const current = Number(customer.points) || 0;
  const points = Math.max(0, current - redeem + earn);
  await updateEntity("customers", customerId, { points });

  return NextResponse.json({
    success: true,
    data: { points, earned: earn, redeemed: redeem },
    error: null,
  });
}
