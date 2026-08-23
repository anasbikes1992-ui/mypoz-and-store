import { NextRequest, NextResponse } from "next/server";
import {
  createUnit,
  listUnits,
  type UnitHousekeeping,
} from "@/lib/server/booking-unit-store";
import type { BookingType } from "@/lib/server/booking-store";
import { occupancyBoard } from "@/lib/server/booking-store";

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
  const view = req.nextUrl.searchParams.get("view");
  if (view === "occupancy") {
    const board = await occupancyBoard(type);
    return NextResponse.json({ success: true, data: board, error: null });
  }
  const units = await listUnits(type);
  return NextResponse.json({ success: true, data: units, error: null });
}

export async function POST(req: NextRequest) {
  let body: { type?: string; name?: string; rate?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  if (!isType(body.type ?? null)) {
    return NextResponse.json(
      { success: false, data: null, error: "type must be room or rent" },
      { status: 400 },
    );
  }
  try {
    const unit = await createUnit(body.type as BookingType, {
      name: String(body.name ?? ""),
      rate: body.rate,
    });
    return NextResponse.json({ success: true, data: unit, error: null });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Failed",
      },
      { status: 400 },
    );
  }
}

export type { UnitHousekeeping };
