import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listSessions,
  checkIn,
  sessionCharge,
} from "@/lib/server/play-store";
import { readSettings } from "@/lib/server/settings-store";
import { parseCsvList } from "@/lib/hp-math";

const schema = z.object({
  name: z.string().max(80).optional(),
  zone: z.string().max(80).optional(),
  ratePerHour: z.coerce.number().min(0),
});

export async function GET() {
  const settings = await readSettings();
  const sessions = await listSessions();
  const zones = parseCsvList(settings.playZones);
  return NextResponse.json({
    success: true,
    data: {
      sessions: sessions.map((s) => ({ ...s, ...sessionCharge(s) })),
      zones: zones.length > 0 ? zones : ["Main floor"],
      maxCapacity: settings.playMaxCapacity,
      defaultRate: settings.playDefaultRate,
      activeCount: sessions.length,
    },
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
  const settings = await readSettings();
  const sessions = await listSessions();
  if (sessions.length >= settings.playMaxCapacity) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: `At capacity (${settings.playMaxCapacity} children on floor)`,
      },
      { status: 422 },
    );
  }
  const zones = parseCsvList(settings.playZones);
  const zone =
    parsed.data.zone?.trim() ||
    zones[0] ||
    "Main floor";
  const session = await checkIn(
    parsed.data.name ?? "",
    parsed.data.ratePerHour,
    zone,
  );
  return NextResponse.json({ success: true, data: session, error: null });
}
