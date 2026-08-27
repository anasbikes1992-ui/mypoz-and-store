import "server-only";
import { resolveDb } from "./backend";
import { dataFile, readJsonFile, writeJsonFile } from "./local-json";
import type { Json } from "@/lib/supabase/database.types";
import { requireSupabase } from "@/lib/supabase/config";

/**
 * Dual-path store for single-document config (business settings, white-label +
 * licence config). One JSON file locally; one `app_documents` row per
 * (organization, key) under RLS in the durable backend.
 */
export interface DocStore<T> {
  read(fallback: T): Promise<T>;
  write(value: T): Promise<T>;
}

export interface DocStoreConfig {
  /** `app_documents.key` for the durable backend. */
  key: string;
  /** File name under `data/` for the local backend. */
  file: string;
}

async function sessionOrgId(
  db: NonNullable<Awaited<ReturnType<typeof resolveDb>>>,
): Promise<string> {
  const {
    data: { user },
    error: userErr,
  } = await db.auth.getUser();
  if (userErr || !user) throw new Error("Unauthorized");
  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string }>();
  if (profileErr) throw new Error(profileErr.message);
  const orgId = profile?.org_id?.trim();
  if (!orgId) throw new Error("No organization on profile");
  return orgId;
}

export function docStore<T>(config: DocStoreConfig): DocStore<T> {
  const file = dataFile(config.file);

  return {
    async read(fallback) {
      const db = await resolveDb();
      if (!db) return readJsonFile<T>(file, fallback);

      const { data, error } = await db
        .from("app_documents")
        .select("data")
        .eq("key", config.key)
        .maybeSingle<{ data: T }>();
      if (error) throw new Error(error.message);
      return data?.data ?? fallback;
    },

    async write(value) {
      const db = await resolveDb();
      if (!db) {
        // Production must not silently write ephemeral local JSON when the
        // session is missing (proxy cookie-presence alone is not enough).
        if (requireSupabase) {
          throw new Error("Unauthorized");
        }
        await writeJsonFile(file, value);
        return value;
      }

      // Upsert on (org_id, key). Explicit org_id avoids select-miss → insert
      // races under RLS that surfaced as app_documents_pkey duplicates.
      const orgId = await sessionOrgId(db);
      const { error } = await db.from("app_documents").upsert(
        {
          org_id: orgId,
          key: config.key,
          data: value as Json,
        },
        { onConflict: "org_id,key" },
      );
      if (error) throw new Error(error.message);
      return value;
    },
  };
}
