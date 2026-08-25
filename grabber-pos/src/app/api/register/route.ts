import { NextRequest, NextResponse } from "next/server";
import {
  getOpenShift,
  openShift,
  closeShift,
  xReport,
  listShiftHistory,
} from "@/lib/server/register-store";
import { requireTenantSession } from "@/lib/server/auth-session";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const [open, history] = await Promise.all([
    getOpenShift(),
    listShiftHistory(50),
  ]);
  return NextResponse.json({
    success: true,
    data: { open, history },
    error: null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  let body: {
    action?: string;
    openedBy?: string;
    closedBy?: string;
    openingFloat?: number;
    closingDeclared?: number;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  try {
    switch (body.action) {
      case "open": {
        const shift = await openShift({
          openedBy: auth.session.email ?? body.openedBy ?? "cashier",
          openingFloat: Number(body.openingFloat) || 0,
          note: body.note,
        });
        return NextResponse.json({ success: true, data: shift, error: null });
      }
      case "close": {
        const shift = await closeShift({
          closedBy: auth.session.email ?? body.closedBy ?? "cashier",
          closingDeclared: Number(body.closingDeclared) || 0,
          note: body.note,
        });
        return NextResponse.json({ success: true, data: shift, error: null });
      }
      case "xreport": {
        const report = await xReport();
        return NextResponse.json({ success: true, data: report, error: null });
      }
      default:
        return NextResponse.json(
          { success: false, data: null, error: "action must be open|close|xreport" },
          { status: 400 },
        );
    }
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
