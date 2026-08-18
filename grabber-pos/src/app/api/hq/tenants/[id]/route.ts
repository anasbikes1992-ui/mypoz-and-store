import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { getHqTenant, updateHqTenant } from "@/lib/server/hq-repo";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const tenant = await getHqTenant(id);
  if (!tenant) {
    return NextResponse.json(
      { success: false, data: null, error: "Tenant not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: tenant, error: null });
}

const putSchema = z.object({
  brand: z
    .object({
      businessName: z.string().max(120).optional(),
      logoUrl: z.string().max(500).optional(),
      accentColor: z.string().max(32).optional(),
    })
    .optional(),
    license: z
      .object({
        plan: z.enum(["starter", "business", "enterprise"]).optional(),
        expiry: z.string().max(20).optional(),
        extras: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).max(40).optional(),
      })
      .optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
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

  const parsed = putSchema.safeParse(body);
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

  const updated = await updateHqTenant(id, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { success: false, data: null, error: "Could not update tenant" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data: updated, error: null });
}
