import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRoles,
  requireTenantSession,
} from "@/lib/server/auth-session";
import {
  approveApproval,
  getApproval,
  rejectApproval,
} from "@/lib/server/approval-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const row = await getApproval(id);
  if (!row) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: row, error: null });
}

const decideSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(400).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const forbidden = requireRoles(gate.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = decideSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid action" },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "reject") {
      const row = await rejectApproval({
        id,
        decidedBy: gate.session.userId,
        reason: parsed.data.reason,
      });
      if (!row) {
        return NextResponse.json(
          { success: false, data: null, error: "Not pending or missing" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: row, error: null });
    }

    const result = await approveApproval({
      id,
      decidedBy: gate.session.userId,
    });
    if (!result) {
      return NextResponse.json(
        { success: false, data: null, error: "Not pending or missing" },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: { ...result.approval, executed: result.executed },
      error: null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Decision failed",
      },
      { status: 422 },
    );
  }
}
