import { NextRequest, NextResponse } from "next/server";
import { readWebsite, writeWebsite } from "@/lib/server/website-store";

export async function GET() {
  const config = await readWebsite();
  return NextResponse.json({ success: true, data: config, error: null });
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
    const config = await writeWebsite(body);
    return NextResponse.json({ success: true, data: config, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Invalid website config",
      },
      { status: 400 },
    );
  }
}
