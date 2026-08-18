import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateDiscountCode, consumeDiscountCode } from "@/lib/server/discount-codes";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().min(0).max(10_000_000),
  consume: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Enter a code and subtotal" },
      { status: 400 },
    );
  }
  const result = await validateDiscountCode(parsed.data.code, parsed.data.subtotal);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, data: null, error: result.error },
      { status: 422 },
    );
  }
  if (parsed.data.consume) {
    await consumeDiscountCode(result.id);
  }
  return NextResponse.json({
    success: true,
    data: { code: result.code, discount: result.discount, id: result.id },
    error: null,
  });
}
