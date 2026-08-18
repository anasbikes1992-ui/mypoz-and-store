import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listAgreements,
  createAgreement,
  hpBalance,
} from "@/lib/server/hp-store";

const schema = z.object({
  customer: z.string().min(1, "Customer is required").max(120),
  phone: z.string().max(40).optional(),
  item: z.string().min(1, "Item is required").max(160),
  total: z.coerce.number().positive("Total must be positive"),
  downPayment: z.coerce.number().min(0).default(0),
  installments: z.coerce.number().int().min(1).default(1),
});

export async function GET() {
  const agreements = await listAgreements();
  return NextResponse.json({
    success: true,
    data: agreements.map((a) => ({ ...a, ...hpBalance(a) })),
    error: null,
  });
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
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  const agreement = await createAgreement(parsed.data);
  return NextResponse.json({ success: true, data: agreement, error: null });
}
