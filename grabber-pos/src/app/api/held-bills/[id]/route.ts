import { NextRequest, NextResponse } from "next/server";
import { getHeldBill, removeHeldBill } from "@/lib/server/held-bills-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bill = await getHeldBill(id);
  if (!bill) {
    return NextResponse.json(
      { success: false, data: null, error: "Held bill not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: bill, error: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await removeHeldBill(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, data: null, error: "Held bill not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: { id }, error: null });
}
