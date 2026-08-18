import { NextRequest, NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import {
  hqPlatformSchema,
  readHqPlatform,
  writeHqPlatform,
} from "@/lib/server/hq-platform-store";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const data = await readHqPlatform();
  return NextResponse.json({ success: true, data, error: null });
}

export async function PUT(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = hqPlatformSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }
  const data = await writeHqPlatform(parsed.data);
  return NextResponse.json({ success: true, data, error: null });
}
