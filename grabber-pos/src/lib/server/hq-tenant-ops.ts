import "server-only";
import { storeConfigSchema } from "@/lib/commerce/schema";
import {
  DEFAULT_HQ_TENANT_OPS,
  hqTenantOpsSchema,
  type HqTenantOps,
} from "@/lib/hq-config";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "@/lib/server/persistence/local-json";
import type { Json } from "@/lib/supabase/database.types";

export type { HqTenantOps };
export { hqTenantOpsSchema, DEFAULT_HQ_TENANT_OPS };

const FILE = dataFile("hq-tenant-ops.json");
const DOC_KEY = "hq_ops";

type LocalMap = Record<string, HqTenantOps>;

async function readLocalMap(): Promise<LocalMap> {
  return readJsonFile<LocalMap>(FILE, {});
}

async function fromRemote(orgId: string): Promise<HqTenantOps | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", orgId)
      .eq("key", DOC_KEY)
      .maybeSingle();
    if (error || !data?.data) return null;
    return hqTenantOpsSchema.parse(data.data);
  } catch {
    return null;
  }
}

async function toRemote(orgId: string, value: HqTenantOps): Promise<boolean> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return false;
  try {
    const db = createServiceSupabase();
    const { error } = await db.from("app_documents").upsert(
      { org_id: orgId, key: DOC_KEY, data: value as unknown as Json },
      { onConflict: "org_id,key" },
    );
    return !error;
  } catch {
    return false;
  }
}

export async function readHqTenantOps(orgId: string): Promise<HqTenantOps> {
  const remote = await fromRemote(orgId);
  if (remote) return remote;
  const map = await readLocalMap();
  return hqTenantOpsSchema.parse(map[orgId] ?? DEFAULT_HQ_TENANT_OPS);
}

export async function writeHqTenantOps(
  orgId: string,
  input: unknown,
): Promise<HqTenantOps> {
  const current = await readHqTenantOps(orgId);
  const next = hqTenantOpsSchema.parse({ ...current, ...(input as object) });
  const saved = await toRemote(orgId, next);
  if (!saved) {
    await withFileLock(FILE, async () => {
      const map = await readLocalMap();
      map[orgId] = next;
      await writeJsonFile(FILE, map);
    });
  }
  await applyOpsToCommerce(orgId, next);
  return next;
}

async function applyOpsToCommerce(orgId: string, ops: HqTenantOps): Promise<void> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return;
  try {
    const db = createServiceSupabase();
    const { data } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", orgId)
      .eq("key", "commerce")
      .maybeSingle();
    const raw = (data?.data ?? {}) as {
      draft?: Record<string, unknown>;
      published?: Record<string, unknown> | null;
      publishedAt?: string | null;
    };
    const draftParsed = storeConfigSchema.safeParse({
      ...(raw.draft ?? {}),
      themeId: ops.storeThemeId,
      announcement: ops.announcement || String(raw.draft?.announcement ?? ""),
      locale: ops.locale,
      status: ops.storeEnabled ? "published" : "draft",
    });
    if (!draftParsed.success) return;
    const publishedParsed = raw.published
      ? storeConfigSchema.safeParse({
          ...raw.published,
          themeId: ops.storeThemeId,
          announcement: ops.announcement || String(raw.published.announcement ?? ""),
          locale: ops.locale,
          status: ops.storeEnabled ? "published" : "draft",
        })
      : null;
    const next = {
      draft: draftParsed.data,
      published: publishedParsed?.success ? publishedParsed.data : raw.published ?? null,
      publishedAt: raw.publishedAt ?? null,
      updatedAt: new Date().toISOString(),
    };
    await db.from("app_documents").upsert(
      { org_id: orgId, key: "commerce", data: next as unknown as Json },
      { onConflict: "org_id,key" },
    );
  } catch {
    // Local tenants keep ops in JSON only.
  }
}
