import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { listHqTenants, onboardHqTenant } from "@/lib/server/hq-repo";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const data = await listHqTenants();
  return NextResponse.json({ success: true, data, error: null });
}

const onboardSchema = z.object({
  name: z.string().min(1).max(160),
  contact: z.string().max(120).optional().default(""),
  plan: z.enum(["starter", "business", "enterprise"]).default("starter"),
  expiry: z.string().max(20).optional().default(""),
  accentColor: z.string().max(32).optional().default(""),
  logoUrl: z.string().max(500).optional().default(""),
  applyBranding: z.boolean().optional().default(false),
  /** HQ default: create durable org + storefront when service role is present. */
  provisionOrg: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = onboardSchema.safeParse(body);
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

  const result = await onboardHqTenant(parsed.data);
  if (parsed.data.provisionOrg && result.provisionError) {
    return NextResponse.json(
      {
        success: false,
        data: result,
        error: `Client saved, but organization provision failed: ${result.provisionError}`,
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: result, error: null });
}
