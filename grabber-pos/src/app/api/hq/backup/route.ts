import { NextRequest, NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { listHqTenants } from "@/lib/server/hq-repo";
import { readHqPlatform } from "@/lib/server/hq-platform-store";
import {
  dumpAllOrgs,
  dumpOneOrg,
  jsonDownload,
} from "@/lib/server/backup-export";

export async function GET(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;

  const orgId = req.nextUrl.searchParams.get("orgId")?.trim();
  const stamp = new Date().toISOString().slice(0, 10);

  try {
    if (orgId) {
      const data = await dumpOneOrg(orgId);
      return jsonDownload(`mypoz-org-${orgId.slice(0, 8)}-${stamp}.json`, data);
    }
    const data = await dumpAllOrgs();
    return jsonDownload(`mypoz-hq-full-${stamp}.json`, data);
  } catch (error) {
    const [{ tenants, source, serviceRole }, platform] = await Promise.all([
      listHqTenants(),
      readHqPlatform(),
    ]);
    const fallback = {
      exportedAt: new Date().toISOString(),
      kind: "metadata-fallback",
      error: error instanceof Error ? error.message : "Full dump failed",
      source,
      serviceRole,
      platform,
      tenants: tenants.map((t) => ({
        id: t.id,
        name: t.name,
        plan: t.plan,
        status: t.status,
        expiry: t.expiry,
        extras: t.extras,
      })),
    };
    return NextResponse.json(
      { success: false, data: fallback, error: fallback.error },
      { status: 500 },
    );
  }
}
