import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listVariants,
  replaceProductVariants,
} from "@/lib/server/variants-repo";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

const draftSchema = z.object({
  id: z.string().max(64).optional(),
  sku: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  option1: z.string().max(80).nullable().optional(),
  option2: z.string().max(80).nullable().optional(),
  option3: z.string().max(80).nullable().optional(),
  salePrice: z.number().min(0).nullable().optional(),
  compareAtPrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).nullable().optional(),
  barcode: z.string().max(80).nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  position: z.number().int().min(0).optional(),
  quantity: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const variants = await listVariants(id);
  return NextResponse.json({ success: true, data: variants, error: null });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = z.array(draftSchema).max(200).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid variants",
      },
      { status: 400 },
    );
  }
  const saved = await replaceProductVariants(
    id,
    parsed.data.map((d) => ({
      ...d,
      option1: d.option1 ?? null,
      option2: d.option2 ?? null,
      option3: d.option3 ?? null,
      salePrice: d.salePrice ?? null,
      compareAtPrice: d.compareAtPrice ?? null,
      costPrice: d.costPrice ?? null,
      barcode: d.barcode ?? null,
      imageUrl: d.imageUrl ?? null,
      position: d.position ?? 0,
      quantity: d.quantity ?? 0,
      isActive: d.isActive !== false,
    })),
  );
  return NextResponse.json({ success: true, data: saved, error: null });
}
