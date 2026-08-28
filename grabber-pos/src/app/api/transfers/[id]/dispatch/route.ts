import { NextRequest, NextResponse } from "next/server";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";
import { businessErrorResponse } from "@/lib/server/business-errors";
import { dispatchTransfer } from "@/lib/server/transfer-store";
import { recordManagerAuthorization } from "@/lib/server/manager-authorization";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  let body: { dispatchedBy?: string } = {};
  try {
    body = await req.json();
  } catch {
    // optional body
  }

  try {
    const data = await dispatchTransfer(
      id,
      body.dispatchedBy ?? auth.session.email ?? auth.session.userId,
    );
    await recordManagerAuthorization({
      actor: auth.session.email ?? auth.session.userId,
      approver: "manager",
      action: "transfer_dispatch",
      entity: "transfer",
      entityId: id,
      reason: `${data.productName} × ${data.quantity}`,
    });
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
