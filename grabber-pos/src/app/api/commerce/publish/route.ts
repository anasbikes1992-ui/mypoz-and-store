import { NextResponse } from "next/server";
import { publishStore } from "@/lib/server/commerce-store";

export async function POST() {
  try {
    const doc = await publishStore();
    return NextResponse.json({ success: true, data: doc, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Publish failed",
      },
      { status: 500 },
    );
  }
}
