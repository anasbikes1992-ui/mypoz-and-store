import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/server/repositories";
import {
  getPermissions,
  permissionsHasPin,
  verifyManagerPin,
} from "@/lib/server/permissions-store";
import { resolvePermission } from "@/lib/permissions";
import { requireTenantSession } from "@/lib/server/auth-session";
import { businessErrorResponse } from "@/lib/server/business-errors";

const bodySchema = z.object({
  reason: z.string().min(1, "Reason is required").max(500),
  managerPin: z.string().min(1, "Manager PIN is required").max(32),
  userId: z.string().max(80).optional(),
  role: z.string().max(40).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid body",
      },
      { status: 400 },
    );
  }

  const cfg = await getPermissions();
  if (!permissionsHasPin(cfg)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: "Manager PIN is not configured. Ask an owner to set it in Permissions.",
      },
      { status: 403 },
    );
  }

  const ok = await verifyManagerPin(parsed.data.managerPin);
  if (!ok) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid manager PIN" },
      { status: 403 },
    );
  }

  const allowed = resolvePermission(cfg, "void_sale", {
    userId: parsed.data.userId ?? auth.session.userId,
    role: parsed.data.role ?? auth.session.role,
  });
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Permission denied: void_sale" },
      { status: 403 },
    );
  }

  try {
    const repo = await getRepository();
    const sale = await repo.voidSale(
      id,
      parsed.data.reason,
      auth.session.email ?? auth.session.userId,
    );
    return NextResponse.json({ success: true, data: sale, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
