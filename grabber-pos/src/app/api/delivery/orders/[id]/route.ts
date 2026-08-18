import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  updateMeta,
  addItem,
  setQty,
  markSent,
  removeOrder,
} from "@/lib/server/delivery-store";
import { getRepository } from "@/lib/server/repositories";
import { printTicket } from "@/lib/server/ticket-printer";
import type { DeliveryStatus } from "@/lib/server/delivery-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await getOrder(id);
  return NextResponse.json({ success: true, data: order, error: null });
}

interface Body {
  action: "meta" | "addItem" | "setQty" | "send" | "settle";
  meta?: {
    customer?: string;
    phone?: string;
    address?: string;
    driver?: string;
    status?: DeliveryStatus;
  };
  productId?: string;
  quantity?: number;
  paymentMethod?: "cash" | "card" | "wholesale";
  cashReceived?: number;
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  try {
    switch (body.action) {
      case "meta": {
        const order = await updateMeta(id, body.meta ?? {});
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "addItem": {
        if (!body.productId) return fail("productId is required");
        const order = await addItem(id, body.productId, body.quantity ?? 1);
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "setQty": {
        if (!body.productId) return fail("productId is required");
        const order = await setQty(id, body.productId, body.quantity ?? 0);
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "send": {
        const { order, sent } = await markSent(id);
        if (sent.length === 0) return fail("Nothing new to send");
        const text = sent.map((s) => `${s.quantity} x ${s.name}`).join("\n");
        const print = await printTicket("KOT", `Delivery ${id}\n${text}`);
        return NextResponse.json({
          success: true,
          data: { order, sent, printed: print.success, printMessage: print.message },
          error: null,
        });
      }
      case "settle": {
        const order = await getOrder(id);
        if (!order || order.lines.length === 0) return fail("Empty order");
        const repo = await getRepository();
        const sale = await repo.createSale({
          lines: order.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            discount: 0,
          })),
          paymentMethod: body.paymentMethod ?? "cash",
          cashReceived: body.cashReceived,
          customerName: order.customer || undefined,
          customerMobile: order.phone || undefined,
        });
        await removeOrder(id);
        return NextResponse.json({ success: true, data: sale, error: null });
      }
      default:
        return fail("Unknown action");
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed", 422);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeOrder(id);
  return NextResponse.json({ success: true, data: null, error: null });
}
