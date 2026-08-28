import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/server/auth-session";
import { buildCustomerProfile } from "@/lib/server/customer-profile";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const profile = await buildCustomerProfile(id);
  if (!profile) {
    return NextResponse.json(
      { success: false, data: null, error: "Customer not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: profile, error: null });
}
