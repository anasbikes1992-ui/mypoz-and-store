import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/server/settings-store";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ success: true, data: settings, error: null });
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
    const settings = await writeSettings(body);
    return NextResponse.json({ success: true, data: settings, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Invalid settings",
      },
      { status: 400 },
    );
  }
}
