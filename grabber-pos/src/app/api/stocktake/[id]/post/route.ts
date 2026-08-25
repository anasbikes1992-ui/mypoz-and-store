import { NextResponse } from "next/server";
import { postStocktake } from "@/lib/server/stocktake-store";
import { logAuditEvent } from "@/lib/server/audit-logger";
import { requireRoles, requireTenantSession } from "@/lib/server/auth-session";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const forbidden = requireRoles(auth.session, ["owner", "manager"]);
  if (forbidden) return forbidden;

  const { id } = await ctx.params;
  try {
    const data = await postStocktake(id);
    await logAuditEvent(
      "stocktake.posted",
      `Posted stocktake ${id}`,
      auth.session.email ?? auth.session.userId,
      { id },
    );
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 422 },
    );
  }
}
