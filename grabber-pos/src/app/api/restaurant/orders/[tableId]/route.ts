import { NextRequest, NextResponse } from "next/server";
import {
  getOrder,
  addItem,
  setQty,
  removeItem,
  markSent,
  clearOrder,
  extractSeatLines,
} from "@/lib/server/restaurant-store";
import { getRepository } from "@/lib/server/repositories";
import { printTicket } from "@/lib/server/ticket-printer";
import type { TicketStation } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;
  const order = await getOrder(tableId);
  return NextResponse.json({ success: true, data: order, error: null });
}

interface ActionBody {
  action: "addItem" | "setQty" | "remove" | "send" | "settle" | "settleSeat";
  productId?: string;
  quantity?: number;
  name?: string;
  modifiers?: string[];
  course?: number;
  seat?: number;
  station?: TicketStation;
  paymentMethod?: "cash" | "card" | "wholesale";
  cashReceived?: number;
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  try {
    switch (body.action) {
      case "addItem": {
        if (!body.productId) return fail("productId is required");
        const order = await addItem(
          tableId,
          body.productId,
          body.quantity ?? 1,
          {
            name: body.name,
            modifiers: body.modifiers,
            course: body.course,
            seat: body.seat,
          },
        );
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "setQty": {
        if (!body.productId) return fail("productId is required");
        const order = await setQty(tableId, body.productId, body.quantity ?? 0);
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "remove": {
        if (!body.productId) return fail("productId is required");
        const order = await removeItem(tableId, body.productId);
        return NextResponse.json({ success: true, data: order, error: null });
      }
      case "send": {
        const station: TicketStation = body.station === "BOT" ? "BOT" : "KOT";
        const { order, sent } = await markSent(tableId);
        if (sent.length === 0) {
          return fail("Nothing new to send");
        }
        const byCourse = new Map<number | "none", typeof sent>();
        for (const s of sent) {
          const key = s.course ?? "none";
          const list = byCourse.get(key) ?? [];
          list.push(s);
          byCourse.set(key, list);
        }
        const parts: string[] = [`Table ${tableId}`];
        const courseKeys = [...byCourse.keys()].sort((a, b) => {
          if (a === "none") return 1;
          if (b === "none") return -1;
          return a - b;
        });
        for (const key of courseKeys) {
          const group = byCourse.get(key)!;
          if (key !== "none") parts.push(`— Course ${key} —`);
          for (const s of group) {
            const seat = s.seat != null ? ` (seat ${s.seat})` : "";
            parts.push(`${s.quantity} x ${s.name}${seat}`);
          }
        }
        const print = await printTicket(station, parts.join("\n"));
        return NextResponse.json({
          success: true,
          data: {
            order,
            sent,
            station,
            printed: print.success,
            printMessage: print.message,
          },
          error: null,
        });
      }
      case "settle": {
        const order = await getOrder(tableId);
        if (!order || order.lines.length === 0) {
          return fail("No open order for this table");
        }
        const repo = await getRepository();
        const sale = await repo.createSale({
          lines: order.lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            discount: 0,
          })),
          paymentMethod: body.paymentMethod ?? "cash",
          cashReceived: body.cashReceived,
        });
        await clearOrder(tableId);
        return NextResponse.json({ success: true, data: sale, error: null });
      }
      case "settleSeat": {
        const seat = body.seat;
        if (seat == null || !(seat > 0)) return fail("seat is required");
        const { order: remaining, lines } = await extractSeatLines(tableId, seat);
        if (lines.length === 0) return fail(`No lines for seat ${seat}`);
        const repo = await getRepository();
        const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
        const sale = await repo.createSale({
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            discount: 0,
          })),
          paymentMethod: body.paymentMethod ?? "cash",
          cashReceived: body.cashReceived ?? total,
        });
        return NextResponse.json({
          success: true,
          data: { sale, order: remaining },
          error: null,
        });
      }
      default:
        return fail("Unknown action");
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Action failed", 422);
  }
}
