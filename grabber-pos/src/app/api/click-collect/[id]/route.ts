import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { patchClickCollect } from "@/lib/server/click-collect-store";

const schema = z.object({
  status: z.enum([
    "new",
    "preparing",
    "ready",
    "done",
    "pending",
    "picked",
    "collected",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "status required" },
      { status: 400 },
    );
  }
  const row = await patchClickCollect(id, parsed.data.status);
  if (!row) {
    return NextResponse.json(
      { success: false, data: null, error: "Not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: row, error: null });
}
