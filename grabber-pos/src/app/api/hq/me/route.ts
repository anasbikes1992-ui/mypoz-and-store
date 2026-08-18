import { NextResponse } from "next/server";
import { getGmsAdmin } from "@/lib/server/gms-auth";

export async function GET() {
  const identity = await getGmsAdmin();
  if (!identity) {
    return NextResponse.json({
      success: true,
      data: { allowed: false },
      error: null,
    });
  }
  return NextResponse.json({
    success: true,
    data: {
      allowed: true,
      role: identity.role,
      id: identity.id,
      kind: identity.kind,
    },
    error: null,
  });
}
