import { NextRequest, NextResponse } from "next/server";
import {
  listStocktakes,
  createStocktake,
} from "@/lib/server/stocktake-store";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const data = await listStocktakes();
  return NextResponse.json({ success: true, data, error: null });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  let body: {
    note?: string;
    lines?: { productId: string; countedQty: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  try {
    if (!body.lines?.length) {
      return NextResponse.json(
        { success: false, data: null, error: "Add at least one counted line" },
        { status: 400 },
      );
    }
    const data = await createStocktake({
      note: body.note,
      lines: body.lines,
    });
    return NextResponse.json({ success: true, data, error: null });
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
