import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readDraftStore, writeDraftStore } from "@/lib/server/commerce-store";
import { verifyDomainDns } from "@/lib/server/domain-verify";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

const bodySchema = z.object({
  host: z.string().trim().min(3).max(200).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  const store = await readDraftStore();
  const host = parsed.success ? (parsed.data.host || store.customDomain) : store.customDomain;
  if (!host) {
    return NextResponse.json(
      { success: false, data: null, error: "Save a custom domain first" },
      { status: 400 },
    );
  }

  const result = await verifyDomainDns(host);
  if (!result.ok) {
    await writeDraftStore({
      customDomain: result.host,
      domainVerifiedAt: "",
    });
    return NextResponse.json(
      { success: false, data: result, error: result.error },
      { status: 422 },
    );
  }

  await writeDraftStore({
    customDomain: result.host,
    domainVerifiedAt: new Date().toISOString(),
  });

  let storefrontUpdated = false;
  if (isSupabaseEnabled) {
    try {
      const db = await createServerSupabase();
      const { error } = await db
        .from("storefronts" as never)
        .update({ domain: result.host, custom_domain: result.host } as never)
        .eq("slug" as never, store.slug);
      storefrontUpdated = !error;
    } catch {
      storefrontUpdated = false;
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      ...result,
      connected: true,
      storefrontUpdated,
      verifiedAt: new Date().toISOString(),
    },
    error: null,
  });
}
