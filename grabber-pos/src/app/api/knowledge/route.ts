import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantSession } from "@/lib/server/auth-session";
import {
  createTenantKb,
  harvestTenantKbFromOrg,
  listTenantKb,
  tenantKnowledgeAllowed,
} from "@/lib/server/tenant-kb-store";

const createSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(8000),
  tags: z.array(z.string().max(40)).max(12).optional(),
  source: z.enum(["manual", "harvest", "upload"]).optional(),
});

export async function GET() {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  if (!(await tenantKnowledgeAllowed())) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          "Custom knowledge base requires Business or Enterprise (or HQ extra: knowledge).",
      },
      { status: 403 },
    );
  }
  const articles = await listTenantKb();
  return NextResponse.json({ success: true, data: articles, error: null });
}

export async function POST(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  if (!(await tenantKnowledgeAllowed())) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          "Custom knowledge base requires Business or Enterprise (or HQ extra: knowledge).",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const asObj = body as { action?: string };
  if (asObj?.action === "harvest") {
    try {
      const result = await harvestTenantKbFromOrg();
      return NextResponse.json({ success: true, data: result, error: null });
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: e instanceof Error ? e.message : "Harvest failed",
        },
        { status: 422 },
      );
    }
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid",
      },
      { status: 400 },
    );
  }
  try {
    const article = await createTenantKb(parsed.data);
    return NextResponse.json({ success: true, data: article, error: null });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Create failed",
      },
      { status: 422 },
    );
  }
}
