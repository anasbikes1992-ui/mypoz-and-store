import { NextResponse } from "next/server";
import { listActive, createOrder, orderTotal } from "@/lib/server/delivery-store";

export async function GET() {
  const orders = await listActive();
  return NextResponse.json({
    success: true,
    data: orders.map((o) => ({ ...o, total: orderTotal(o) })),
    error: null,
  });
}

export async function POST() {
  const order = await createOrder();
  return NextResponse.json({ success: true, data: order, error: null });
}
