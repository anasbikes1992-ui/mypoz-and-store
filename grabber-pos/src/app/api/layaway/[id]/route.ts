import { NextRequest, NextResponse } from "next/server";
import {
  addLayawayDeposit,
  getLayaway,
  patchLayaway,
} from "@/lib/server/layaway-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const row = await getLayaway(id);
  if (!row) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: row, error: null });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: {
    amount?: number;
    status?: "active" | "completed" | "cancelled";
    linesSummary?: string;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  if (body.amount != null && Number(body.amount) > 0) {
    const row = await addLayawayDeposit(id, Number(body.amount));
    if (!row) {
      return NextResponse.json(
        { success: false, data: null, error: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: row, error: null });
  }

  const row = await patchLayaway(id, {
    status: body.status,
    linesSummary: body.linesSummary,
  });
  if (!row) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: row, error: null });
}
