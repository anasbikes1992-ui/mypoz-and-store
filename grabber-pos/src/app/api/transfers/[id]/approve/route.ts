import { NextResponse } from "next/server";
import { approveTransferReceipt } from "@/lib/server/transfer-store";
import { logAuditEvent } from "@/lib/server/audit-logger";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let receivedBy = "staff";
  try {
    const body = await req.json();
    if (body?.receivedBy) receivedBy = String(body.receivedBy);
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
