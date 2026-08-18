import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listClickCollect,
  createClickCollect,
} from "@/lib/server/click-collect-store";

const schema = z.object({
  customer: z.string().min(1, "Customer is required").max(120),
  phone: z.string().max(40).optional(),
  items: z.string().min(1, "Items are required").max(500),
  note: z.string().max(300).optional(),
});

export async function GET() {
  const rows = await listClickCollect();
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
  const row = await createClickCollect(parsed.data);
  return NextResponse.json({ success: true, data: row, error: null });
}
