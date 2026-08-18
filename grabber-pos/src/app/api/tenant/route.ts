import { NextRequest, NextResponse } from "next/server";
import { readTenant, writeTenant } from "@/lib/server/tenant-store";
import { planEnabledKeys, isLicenseExpired } from "@/lib/plans";
import { MODULE_GROUPS } from "@/lib/modules";

function allKeys(): string[] {
  return MODULE_GROUPS.flatMap((g) => g.tiles.map((t) => t.key));
}

export async function GET() {
  const tenant = await readTenant();
  const enabled = [
    ...planEnabledKeys(tenant.license.plan, allKeys(), tenant.license.extras),
  ];
  return NextResponse.json({
    success: true,
    data: {
      ...tenant,
      enabledKeys: enabled,
      expired: isLicenseExpired(tenant.license.expiry),
    },
    error: null,
  });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const tenant = await writeTenant(body as Record<string, never>);
  const enabled = [
    ...planEnabledKeys(tenant.license.plan, allKeys(), tenant.license.extras),
  ];
  return NextResponse.json({
    success: true,
    data: { ...tenant, enabledKeys: enabled },
    error: null,
  });
}
