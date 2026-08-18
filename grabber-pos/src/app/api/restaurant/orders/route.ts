import { NextResponse } from "next/server";
import { listOpenOrders } from "@/lib/server/restaurant-store";

export async function GET() {
  const orders = await listOpenOrders();
  return NextResponse.json({ success: true, data: orders, error: null });
}
