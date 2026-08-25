import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FULFILLMENT_STATUSES } from "@/lib/commerce/schema";
import { allowedFulfillmentNext } from "@/lib/commerce/order-lifecycle";
import {
  listStorefrontWebOrders,
  updateStorefrontWebOrder,
} from "@/lib/server/storefront-orders-store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

const bodySchema = z.object({
  status: z.enum(FULFILLMENT_STATUSES),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid status" },
      { status: 400 },
    );
  }

  const orders = await listStorefrontWebOrders();
  const order = orders.find((o) => o.id === id || o.receiptNo === id);
  if (!order) {
    return NextResponse.json(
      { success: false, data: null, error: "Order not found" },
      { status: 404 },
    );
  }

  const allowed = allowedFulfillmentNext(
    order.fulfillmentStatus ?? "pending",
    order.fulfilment === "pickup" ? "pickup" : "delivery",
  );
  if (!allowed.includes(parsed.data.status)) {
    return NextResponse.json(
      { success: false, data: null, error: "That status change is not allowed" },
      { status: 422 },
    );
  }

  const updated = await updateStorefrontWebOrder(order.id, {
    fulfillmentStatus: parsed.data.status,
  });

  if (isSupabaseEnabled && order.saleId && /^[0-9a-f-]{36}$/i.test(order.saleId)) {
    try {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const db = await createServerSupabase();
      await db.rpc("update_sale_fulfillment", {
        p_sale: order.saleId,
        p_status: parsed.data.status,
      });
    } catch {
      // JSON row is source of truth in demo; durable RPC is best-effort.
    }
  }

  if (order.customerMobile) {
    const { notifyWhatsAppOrderStatus } = await import("@/lib/server/whatsapp");
    await notifyWhatsAppOrderStatus({
      to: order.customerMobile,
      receipt: order.receiptNo || order.id,
      status: parsed.data.status,
    });
  }

  return NextResponse.json({ success: true, data: updated, error: null });
}
