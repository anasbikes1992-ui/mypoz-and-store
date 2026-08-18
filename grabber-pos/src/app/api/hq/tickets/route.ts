import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import {
  createHqTicket,
  listHqTickets,
  updateHqTicket,
} from "@/lib/server/hq-repo";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const data = await listHqTickets();
  return NextResponse.json({ success: true, data, error: null });
}

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().max(4000).optional().default(""),
  tenantId: z.string().max(80).optional().default(""),
  tenantName: z.string().max(160).optional().default(""),
  priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  contact: z.string().max(120).optional().default(""),
});

export async function POST(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const ticket = await createHqTicket(parsed.data);
  return NextResponse.json({ success: true, data: ticket, error: null });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  body: z.string().max(4000).optional(),
});

export async function PATCH(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  const { id, ...patch } = parsed.data;
  const updated = await updateHqTicket(id, patch);
  if (!updated) {
    return NextResponse.json(
      { success: false, data: null, error: "Ticket not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: updated, error: null });
}
