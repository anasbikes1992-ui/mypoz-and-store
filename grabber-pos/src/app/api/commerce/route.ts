import { NextRequest, NextResponse } from "next/server";
import {
  readCommerce,
  readDraftStore,
  writeDraftStore,
} from "@/lib/server/commerce-store";

export async function GET() {
  const doc = await readCommerce();
  return NextResponse.json({ success: true, data: doc, error: null });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  try {
    const draft = await writeDraftStore(body);
    return NextResponse.json({ success: true, data: draft, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Invalid store config",
      },
      { status: 400 },
    );
  }
}

/** Used by GET consumers that only need the draft. */
export async function PATCH() {
  const draft = await readDraftStore();
  return NextResponse.json({ success: true, data: draft, error: null });
}
