import { NextRequest, NextResponse } from "next/server";
import { receivePO } from "@/lib/server/po-store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const po = await receivePO(id);
    return NextResponse.json({ success: true, data: po, error: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: error instanceof Error ? error.message : "Failed" },
      { status: 422 },
    );
  }
}
