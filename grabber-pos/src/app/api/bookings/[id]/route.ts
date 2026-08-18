import { NextRequest, NextResponse } from "next/server";
import {
  getBooking,
  updateMeta,
  addExtra,
  removeExtra,
  removeBooking,
  bookingTotals,
} from "@/lib/server/booking-store";
import { createSale } from "@/lib/server/sales-repo";
import { BOOKING_CONFIG } from "@/lib/bookings-config";
import type { BookingStatus } from "@/lib/server/booking-store";
import type { SaleLine } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const booking = await getBooking(id);
  return NextResponse.json({ success: true, data: booking, error: null });
}

interface Body {
  action: "meta" | "addExtra" | "removeExtra" | "settle";
  meta?: Record<string, string | number>;
  description?: string;
  amount?: number;
  extraId?: string;
  paymentMethod?: "cash" | "card" | "wholesale";
  cashReceived?: number;
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}
function ok(data: unknown) {
  return NextResponse.json({ success: true, data, error: null });
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
      case "meta":
        return ok(
          await updateMeta(id, (body.meta ?? {}) as { status?: BookingStatus }),
        );
      case "addExtra":
        if (!body.description) return fail("description is required");
        return ok(
          await addExtra(id, body.description, Number(body.amount) || 0),
        );
      case "removeExtra":
        if (!body.extraId) return fail("extraId is required");
        return ok(await removeExtra(id, body.extraId));
      case "settle": {
        const booking = await getBooking(id);
        if (!booking) return fail("Booking not found", 404);
        const totals = bookingTotals(booking);
        if (totals.total <= 0) return fail("Nothing to bill — set dates and rate");

        const cfg = BOOKING_CONFIG[booking.type];
        const lines: SaleLine[] = [
          {
            productId: "",
            name: `${booking.subject || cfg.subjectLabel} · ${totals.duration} ${cfg.unit}`,
            unitPrice: booking.rate,
            quantity: totals.duration,
            discount: 0,
            lineTotal: totals.stayCharge,
          },
          ...booking.extras.map((e) => ({
            productId: "",
            name: e.description,
            unitPrice: e.amount,
            quantity: 1,
            discount: 0,
            lineTotal: e.amount,
          })),
        ];
        const method = body.paymentMethod ?? "cash";
        const cash =
          method === "cash" ? (Number(body.cashReceived) || totals.total) : null;

        const sale = await createSale({
          lines,
          subtotal: totals.total,
          discountTotal: 0,
          finalDiscount: 0,
          serviceCharge: 0,
          total: totals.total,
          paymentMethod: method,
          isWholesale: false,
          customerName: booking.customer || null,
          customerMobile: booking.phone || null,
          employee: null,
          cashReceived: cash,
          change: cash != null ? cash - totals.total : null,
        });
        await removeBooking(id);
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
  await removeBooking(id);
  return NextResponse.json({ success: true, data: null, error: null });
}
