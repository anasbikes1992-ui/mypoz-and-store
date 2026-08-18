import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listLayaways, createLayaway } from "@/lib/server/layaway-store";

const schema = z.object({
  customer: z.string().min(1, "Customer is required").max(120),
  phone: z.string().max(40).optional(),
  total: z.coerce.number().positive("Total must be positive"),
  deposit: z.coerce.number().min(0).default(0),
  linesSummary: z.string().max(300).optional(),
});

export async function GET() {
  const rows = await listLayaways();
  return NextResponse.json({ success: true, data: rows, error: null });
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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid",
      },
      { status: 400 },
    );
  }
  const row = await createLayaway(parsed.data);
  return NextResponse.json({ success: true, data: row, error: null });
}
