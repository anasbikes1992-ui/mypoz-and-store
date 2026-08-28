import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";
import { businessErrorResponse } from "@/lib/server/business-errors";
import { createReturn, listReturns } from "@/lib/server/returns-store";
import {
  getPermissions,
  permissionsHasPin,
  verifyManagerPin,
} from "@/lib/server/permissions-store";
import { resolvePermission } from "@/lib/permissions";
import { recordManagerAuthorization } from "@/lib/server/manager-authorization";

const bodySchema = z.object({
  saleId: z.string().min(1).max(80),
  reason: z.string().trim().min(2).max(500),
  note: z.string().trim().max(1000).optional(),
  refundMethod: z.enum(["cash", "original", "store_credit"]).optional(),
  refundNote: z.string().trim().max(1000).optional(),
  managerPin: z.string().min(1).max(32),
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

  const cfg = await getPermissions();
  if (!permissionsHasPin(cfg)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          "Manager PIN is not configured. Ask an owner to set it in Permissions.",
      },
      { status: 403 },
    );
  }

  const pinOk = await verifyManagerPin(parsed.data.managerPin);
  if (!pinOk) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid manager PIN" },
      { status: 403 },
    );
  }

  const allowed = resolvePermission(cfg, "void_sale", {
    userId: auth.session.userId,
    role: auth.session.role,
  });
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: "Permission denied for returns" },
      { status: 403 },
    );
  }

  try {
    const data = await createReturn(parsed.data);
    await recordManagerAuthorization({
      actor: auth.session.email ?? auth.session.userId,
      approver: "manager",
      action: "process_return",
      entity: "sale",
      entityId: parsed.data.saleId,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
