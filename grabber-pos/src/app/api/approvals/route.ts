import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  requireRoles,
  requireTenantSession,
} from "@/lib/server/auth-session";
import {
  listApprovals,
  proposeApproval,
} from "@/lib/server/approval-store";
import { APPROVAL_KINDS } from "@/lib/ai/approvals";

export async function GET(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const status = req.nextUrl.searchParams.get("status");
  const rows = await listApprovals(
    status === "pending" ||
      status === "approved" ||
      status === "rejected" ||
      status === "expired"
      ? { status }
      : undefined,
  );
  return NextResponse.json({ success: true, data: rows, error: null });
}

const proposeSchema = z.object({
  kind: z.enum(APPROVAL_KINDS),
  agentId: z.string().max(64).default("manual"),
  title: z.string().min(1).max(160),
  summary: z.string().max(400).optional(),
  payload: z.record(z.string(), z.unknown()),
});

/** Manual propose (rare) — agents normally use propose_* tools. */
export async function POST(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const forbidden = requireRoles(gate.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = proposeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid proposal" },
      { status: 400 },
    );
  }
  const { kind, agentId, title, summary, payload } = parsed.data;
  if (kind === "kb_article_draft") {
    const titleP = String(payload.title ?? "").trim();
    const bodyP = String(payload.body ?? "").trim();
    if (!titleP || !bodyP) {
      return NextResponse.json(
        { success: false, data: null, error: "title and body required" },
        { status: 400 },
      );
    }
    const row = await proposeApproval({
      kind,
      agentId,
      plane: "owner",
      title,
      summary: summary || titleP.slice(0, 120),
      proposedBy: gate.session.userId,
      payload: {
        kind,
        title: titleP,
        body: bodyP,
        tags: Array.isArray(payload.tags)
          ? (payload.tags as string[]).map(String).slice(0, 12)
          : undefined,
      },
    });
    return NextResponse.json({ success: true, data: row, error: null });
  }
  if (kind === "wa_outbound_draft") {
    const to = String(payload.to ?? "").trim();
    const text = String(payload.body ?? "").trim();
    if (!to || !text) {
      return NextResponse.json(
        { success: false, data: null, error: "to and body required" },
        { status: 400 },
      );
    }
    const row = await proposeApproval({
      kind,
      agentId,
      plane: "owner",
      title,
      summary: summary || `WhatsApp to ${to}`,
      proposedBy: gate.session.userId,
      payload: {
        kind,
        to,
        body: text,
        note: payload.note ? String(payload.note) : undefined,
      },
    });
    return NextResponse.json({ success: true, data: row, error: null });
  }
  return NextResponse.json(
    { success: false, data: null, error: "Unsupported kind" },
    { status: 400 },
  );
}
