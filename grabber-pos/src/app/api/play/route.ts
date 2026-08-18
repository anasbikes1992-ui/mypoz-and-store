import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listSessions,
  checkIn,
  sessionCharge,
} from "@/lib/server/play-store";

const schema = z.object({
  name: z.string().max(80).optional(),
  ratePerHour: z.coerce.number().min(0),
});

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json({
    success: true,
    data: sessions.map((s) => ({ ...s, ...sessionCharge(s) })),
    error: null,
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  const session = await checkIn(parsed.data.name ?? "", parsed.data.ratePerHour);
  return NextResponse.json({ success: true, data: session, error: null });
}
