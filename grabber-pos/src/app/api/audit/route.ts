import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent, listAuditEvents } from "@/lib/server/audit-logger";

export async function GET() {
  const logs = await listAuditEvents(100);
  return NextResponse.json({ success: true, data: logs, error: null });
}

export async function POST(req: NextRequest) {
  let body: { action?: string; details?: string; actor?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, data: null, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !body.details) {
    return NextResponse.json({ success: false, data: null, error: "action and details are required" }, { status: 400 });
  }

  const log = await logAuditEvent(
    body.action as any,
    body.details,
    body.actor || "Cashier",
    body.metadata,
  );
  return NextResponse.json({ success: true, data: log, error: null });
}
