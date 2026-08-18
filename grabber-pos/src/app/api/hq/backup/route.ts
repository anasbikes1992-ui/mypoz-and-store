import { NextResponse } from "next/server";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { listHqTenants } from "@/lib/server/hq-repo";
import { readHqPlatform } from "@/lib/server/hq-platform-store";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const [{ tenants, source, serviceRole }, platform] = await Promise.all([
    listHqTenants(),
    readHqPlatform(),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  const data = {
    exportedAt: new Date().toISOString(),
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
  return new NextResponse(JSON.stringify({ success: true, data }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="mypoz-hq-backup-${stamp}.json"`,
    },
  });
}
