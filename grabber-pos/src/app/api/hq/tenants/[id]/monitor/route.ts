import { NextRequest, NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { getHqTenantMonitor } from "@/lib/server/hq-monitor";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const data = await getHqTenantMonitor(id);
  return NextResponse.json({ success: true, data, error: null });
}
