import { NextRequest, NextResponse } from "next/server";
import { stockOpSchema } from "@/lib/validation";
import {
  createStockDoc,
  listStockDocs,
  DIRECTION,
  type StockOpType,
} from "@/lib/server/stock-store";

function isType(t: string): t is StockOpType {
  return Object.prototype.hasOwnProperty.call(DIRECTION, t);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!isType(type)) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown stock operation" },
      { status: 404 },
    );
  }
  const docs = await listStockDocs(type);
  return NextResponse.json({ success: true, data: docs, error: null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const { type } = await params;
  if (!isType(type)) {
    return NextResponse.json(
      { success: false, data: null, error: "Unknown stock operation" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = stockOpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const doc = await createStockDoc(type, parsed.data);
    return NextResponse.json({ success: true, data: doc, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 422 },
    );
  }
}
