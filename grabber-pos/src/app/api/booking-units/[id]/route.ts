import { NextRequest, NextResponse } from "next/server";
import {
  getUnit,
  removeUnit,
  updateUnit,
  type UnitHousekeeping,
} from "@/lib/server/booking-unit-store";

const STATUSES: UnitHousekeeping[] = [
  "available",
  "occupied",
  "dirty",
  "out_of_order",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const unit = await getUnit(id);
  if (!unit) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: unit, error: null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    name?: string;
    rate?: number;
    status?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  if (body.status && !STATUSES.includes(body.status as UnitHousekeeping)) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid status" },
      { status: 400 },
    );
  }
  const unit = await updateUnit(id, {
    name: body.name,
    rate: body.rate,
    status: body.status as UnitHousekeeping | undefined,
    note: body.note,
  });
  if (!unit) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: unit, error: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeUnit(id);
  return NextResponse.json({ success: true, data: null, error: null });
}
