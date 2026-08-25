import { NextRequest, NextResponse } from "next/server";
import {
  listTransfers,
  createTransferRequest,
} from "@/lib/server/transfer-store";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const data = await listTransfers();
  return NextResponse.json({ success: true, data, error: null });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  let body: {
    sourceBranch?: string;
    targetBranch?: string;
    productId?: string;
    productName?: string;
    quantity?: number;
    dispatchedBy?: string;
    notes?: string;
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
    if (!body.productId || !body.targetBranch || !body.sourceBranch) {
      return NextResponse.json(
        { success: false, data: null, error: "source, target and product required" },
        { status: 400 },
      );
    }
    const data = await createTransferRequest({
      sourceBranch: body.sourceBranch,
      targetBranch: body.targetBranch,
      productId: body.productId,
      productName: body.productName || body.productId,
      quantity: Number(body.quantity) || 1,
      dispatchedBy: auth.session.email ?? body.dispatchedBy ?? "staff",
      notes: body.notes,
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
