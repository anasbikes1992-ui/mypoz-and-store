import { NextResponse } from "next/server";
import { postStocktake } from "@/lib/server/stocktake-store";
import { logAuditEvent } from "@/lib/server/audit-logger";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  try {
    const data = await postStocktake(id);
    await logAuditEvent(
      "stocktake.posted",
      `Posted stocktake ${id}`,
      "manager",
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
