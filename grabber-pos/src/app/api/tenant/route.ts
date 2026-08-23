import { NextRequest, NextResponse } from "next/server";
import { readTenant, writeTenant } from "@/lib/server/tenant-store";
import {
  planEnabledKeys,
  isLicenseExpired,
  type PlanTier,
} from "@/lib/plans";
import { MODULE_GROUPS } from "@/lib/modules";
import { readHqTenantOps } from "@/lib/server/hq-tenant-ops";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";

function allKeys(): string[] {
  return MODULE_GROUPS.flatMap((g) => g.tiles.map((t) => t.key));
}

async function sessionOrgId(): Promise<string | null> {
  if (!isSupabaseEnabled) return null;
  try {
    const sb = await createServerSupabase();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile } = await sb
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle<{ org_id: string }>();
    return profile?.org_id ?? null;
  } catch {
    return null;
  }
}

async function enabledKeysForTenant(
  plan: PlanTier,
  extras: string[] | undefined,
  orgId: string | null,
): Promise<string[]> {
  let enabled = [...planEnabledKeys(plan, allKeys(), extras ?? [])];
  if (orgId) {
    try {
      const ops = await readHqTenantOps(orgId);
      if (!ops.wholesaleEnabled) {
        enabled = enabled.filter((k) => k !== "wholesale");
      }
    } catch {
      // ops optional
    }
  }
  return enabled;
}

export async function GET() {
  const tenant = await readTenant();
  const orgId = await sessionOrgId();
  const enabled = await enabledKeysForTenant(
    tenant.license.plan,
    tenant.license.extras,
    orgId,
  );
  let wholesaleEnabled = true;
  if (orgId) {
    try {
      wholesaleEnabled = (await readHqTenantOps(orgId)).wholesaleEnabled;
    } catch {
      wholesaleEnabled = true;
    }
  }
  return NextResponse.json({
    success: true,
    data: {
      ...tenant,
      enabledKeys: enabled,
      expired: isLicenseExpired(tenant.license.expiry),
      wholesaleEnabled,
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
  const orgId = await sessionOrgId();
  const enabled = await enabledKeysForTenant(
    tenant.license.plan,
    tenant.license.extras,
    orgId,
  );
  return NextResponse.json({
    success: true,
    data: { ...tenant, enabledKeys: enabled },
    error: null,
  });
}
