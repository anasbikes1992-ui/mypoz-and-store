import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getTenantKb,
  removeTenantKb,
  tenantKnowledgeAllowed,
  updateTenantKb,
} from "@/lib/server/tenant-kb-store";

const patchSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  body: z.string().min(1).max(8000).optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await tenantKnowledgeAllowed())) {
    return NextResponse.json(
      { success: false, data: null, error: "Knowledge base not on this plan" },
      { status: 403 },
    );
  }
  const { id } = await params;
  const article = await getTenantKb(id);
  return NextResponse.json({
    success: true,
    data: article,
    error: article ? null : "Not found",
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await tenantKnowledgeAllowed())) {
    return NextResponse.json(
      { success: false, data: null, error: "Knowledge base not on this plan" },
      { status: 403 },
    );
  }
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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid patch" },
      { status: 400 },
    );
  }
  try {
    const article = await updateTenantKb(id, parsed.data);
    if (!article) {
      return NextResponse.json(
        { success: false, data: null, error: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: article, error: null });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Update failed",
      },
      { status: 422 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await tenantKnowledgeAllowed())) {
    return NextResponse.json(
      { success: false, data: null, error: "Knowledge base not on this plan" },
      { status: 403 },
    );
  }
  const { id } = await params;
  await removeTenantKb(id);
  return NextResponse.json({ success: true, data: null, error: null });
}
