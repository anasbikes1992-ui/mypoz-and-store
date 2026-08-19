import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestUxEvent, listUxEvents } from "@/lib/server/observability-store";

const bodySchema = z.object({
  sessionId: z.string().min(1).max(80),
  kind: z.enum(["click", "nav", "error", "ux_failure", "rage_click"]),
  path: z.string().max(200).default("/"),
  message: z.string().max(500).optional(),
  at: z.string().max(40).optional(),
  slug: z.string().max(80).optional(),
  replay: z
    .array(
      z.object({
        t: z.number(),
        type: z.enum(["click", "nav", "error", "ux_failure", "rage_click", "input"]),
        path: z.string().max(200),
        tag: z.string().max(80).optional(),
        x: z.number().optional(),
        y: z.number().optional(),
        detail: z.string().max(120).optional(),
      }),
    )
    .max(40)
    .optional(),
});

export async function GET() {
  try {
    const events = await listUxEvents();
    return NextResponse.json({ success: true, data: events, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Could not list events",
      },
      { status: 401 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid event" },
      { status: 400 },
    );
  }
  const kind =
    parsed.data.kind === "rage_click" ? "ux_failure" : parsed.data.kind;
  if (kind !== "error" && kind !== "ux_failure") {
    return NextResponse.json({ success: true, data: { stored: false }, error: null });
  }
  const row = await ingestUxEvent(
    { ...parsed.data, kind },
    {
      slug: parsed.data.slug,
      host: req.headers.get("x-mypoz-host") || req.headers.get("host") || "",
    },
  );
  return NextResponse.json({ success: true, data: { id: row.id }, error: null });
}
