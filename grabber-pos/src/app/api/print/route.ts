import { NextRequest, NextResponse } from "next/server";
import { kickCashDrawer, printTicket } from "@/lib/server/ticket-printer";
import type { TicketStation } from "@/lib/types";
import { requireTenantSession } from "@/lib/server/auth-session";

const STATIONS: TicketStation[] = ["KOT", "BOT", "RECEIPT", "DRAWER"];
const MAX_CONTENT_LENGTH = 4000;

export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  let body: { station?: string; content?: string; kick?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (body.kick === true || body.station === "DRAWER") {
    const result = await kickCashDrawer();
    return NextResponse.json(
      {
        success: result.success,
        data: null,
        error: result.success ? null : result.message,
      },
      { status: result.success ? 200 : 502 },
    );
  }

  const station = body.station as TicketStation;
  if (!STATIONS.includes(station) || station === "DRAWER") {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "station must be KOT, BOT or RECEIPT (or kick:true / DRAWER)",
      },
      { status: 400 },
    );
  }
  const content = String(body.content ?? "").slice(0, MAX_CONTENT_LENGTH);
  if (!content.trim()) {
    return NextResponse.json(
      { success: false, data: null, error: "content is required" },
      { status: 400 },
    );
  }

  const result = await printTicket(station, content);
  return NextResponse.json(
    {
      success: result.success,
      data: null,
      error: result.success ? null : result.message,
    },
    { status: result.success ? 200 : 502 },
  );
}
