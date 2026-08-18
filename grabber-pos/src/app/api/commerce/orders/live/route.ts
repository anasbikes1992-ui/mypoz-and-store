import { NextResponse } from "next/server";
import { listStorefrontWebOrders } from "@/lib/server/storefront-orders-store";

/** Recent online orders for POS alerts (demo poll + supabase fallback). */
export async function GET() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const orders = (await listStorefrontWebOrders()).filter((o) => {
    const t = Date.parse(o.createdAt);
    if (!Number.isFinite(t) || t < cutoff) return false;
    const done = ["delivered", "collected", "cancelled"].includes(
      o.fulfillmentStatus ?? "",
    );
    return !done;
  });
  return NextResponse.json({ success: true, data: orders.slice(0, 20), error: null });
}
