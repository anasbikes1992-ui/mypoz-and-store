import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listStorefrontWebOrders,
  updateStorefrontWebOrder,
} from "@/lib/server/storefront-orders-store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(
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
      { success: false, data: null, error: "Invalid request" },
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

  const { action, note } = parsed.data;

  if (action === "reject") {
    const updated = await updateStorefrontWebOrder(order.id, {
      paymentProofStatus: "rejected",
      paymentProofNote: note || "",
    });
    return NextResponse.json({ success: true, data: updated, error: null });
  }

  // approve
  const updated = await updateStorefrontWebOrder(order.id, {
    pendingPayment: false,
    paymentProofStatus: "approved",
    ...(note ? { paymentProofNote: note } : {}),
  });

  if (isSupabaseEnabled && order.saleId && /^[0-9a-f-]{36}$/i.test(order.saleId)) {
    try {
      const { createServerSupabase } = await import("@/lib/supabase/server");
      const db = await createServerSupabase();
      await db
        .from("sales")
        .update({ payment_status: "paid" } as never)
        .eq("id", order.saleId);
    } catch {
      // Durable payment_status flip is best-effort; JSON order is source of truth.
    }
  }

  return NextResponse.json({ success: true, data: updated, error: null });
}
