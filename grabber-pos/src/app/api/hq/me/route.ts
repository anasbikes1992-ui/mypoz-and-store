import { NextResponse } from "next/server";
import { getGmsAdmin } from "@/lib/server/gms-auth";

export async function GET() {
  const identity = await getGmsAdmin();
  if (!identity) {
    return NextResponse.json(
      { success: false, data: null, error: "Forbidden" },
      { status: 403 },
    );
  }
  return NextResponse.json({
    success: true,
    data: { role: identity.role, id: identity.id, kind: identity.kind },
    error: null,
  });
}
