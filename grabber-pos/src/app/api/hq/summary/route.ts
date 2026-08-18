import { NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { getHqSummary } from "@/lib/server/hq-repo";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const data = await getHqSummary();
  return NextResponse.json({ success: true, data, error: null });
}
