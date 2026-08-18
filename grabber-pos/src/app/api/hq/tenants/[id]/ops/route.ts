import { NextRequest, NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { getHqTenant } from "@/lib/server/hq-repo";
import {
  hqTenantOpsSchema,
  readHqTenantOps,
  writeHqTenantOps,
} from "@/lib/server/hq-tenant-ops";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const tenant = await getHqTenant(id);
  if (!tenant) {
    return NextResponse.json(
      { success: false, data: null, error: "Tenant not found" },
      { status: 404 },
    );
  }
  const data = await readHqTenantOps(id);
  return NextResponse.json({ success: true, data, error: null });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const tenant = await getHqTenant(id);
  if (!tenant) {
    return NextResponse.json(
      { success: false, data: null, error: "Tenant not found" },
      { status: 404 },
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
  const parsed = hqTenantOpsSchema.partial().safeParse(body);
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
  const data = await writeHqTenantOps(id, parsed.data);
  return NextResponse.json({ success: true, data, error: null });
}
