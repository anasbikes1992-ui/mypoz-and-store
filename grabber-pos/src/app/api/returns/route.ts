import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";
import { businessErrorResponse } from "@/lib/server/business-errors";
import { createReturn, listReturns } from "@/lib/server/returns-store";

const bodySchema = z.object({
  saleId: z.string().min(1).max(80),
  reason: z.string().trim().min(2).max(500),
  note: z.string().trim().max(1000).optional(),
  refundMethod: z.enum(["cash", "original", "store_credit"]).optional(),
  refundNote: z.string().trim().max(1000).optional(),
  lines: z
    .array(
      z.object({
        saleLineId: z.string().uuid(),
        quantity: z.number().positive(),
        disposition: z.enum(["restock", "damage", "discard"]).optional(),
      }),
    )
    .min(1),
});

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const data = await listReturns();
  return NextResponse.json({ success: true, data, error: null });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid return payload",
      },
      { status: 400 },
    );
  }

  try {
    const data = await createReturn(parsed.data);
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
