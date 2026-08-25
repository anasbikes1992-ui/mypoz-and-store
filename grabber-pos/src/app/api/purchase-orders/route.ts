import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listPOs, createPO } from "@/lib/server/po-store";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

const poSchema = z.object({
  supplier: z.string().max(160).optional(),
  reference: z.string().max(120).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, "Add at least one line"),
});

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const pos = await listPOs();
  return NextResponse.json({ success: true, data: pos, error: null });
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
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = poSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid" },
      { status: 400 },
    );
  }
  try {
    const po = await createPO(parsed.data);
    return NextResponse.json({ success: true, data: po, error: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: error instanceof Error ? error.message : "Failed" },
      { status: 422 },
    );
  }
}
