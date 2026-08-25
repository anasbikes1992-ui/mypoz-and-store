import { NextResponse } from "next/server";
import { approveTransferReceipt } from "@/lib/server/transfer-store";
import { logAuditEvent } from "@/lib/server/audit-logger";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  const receivedBy = auth.session.email ?? "staff";
  try {
    await req.json();
  } catch {
    // optional body
  }
  try {
    const data = await approveTransferReceipt(id, receivedBy);
    await logAuditEvent(
      "transfer.approved",
      `Approved transfer ${id}`,
      receivedBy,
      { id },
    );
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
