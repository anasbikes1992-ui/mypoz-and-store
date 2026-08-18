import { NextRequest, NextResponse } from "next/server";
import {
  listBookings,
  createBooking,
  bookingTotals,
} from "@/lib/server/booking-store";
import type { BookingType } from "@/lib/server/booking-store";

function isType(t: string | null): t is BookingType {
  return t === "room" || t === "rent";
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  if (!isType(type)) {
    return NextResponse.json(
      { success: false, data: null, error: "type must be room or rent" },
      { status: 400 },
    );
  }
  const bookings = await listBookings(type);
  return NextResponse.json({
    success: true,
    data: bookings.map((b) => ({ ...b, total: bookingTotals(b).total })),
    error: null,
  });
}

export async function POST(req: NextRequest) {
  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!isType(body.type ?? null)) {
    return NextResponse.json(
      { success: false, data: null, error: "type must be room or rent" },
      { status: 400 },
    );
  }
  const booking = await createBooking(body.type as BookingType);
  return NextResponse.json({ success: true, data: booking, error: null });
}
