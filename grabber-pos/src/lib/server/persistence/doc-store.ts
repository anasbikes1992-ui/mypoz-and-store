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

      // RLS policies on app_documents supply org_id from the session automatically.
      // We cannot put org_id in the payload without a second round-trip to read
      // current_org_id(), so we use a select-then-update/insert pattern instead
      // of relying on the composite unique constraint directly.
      const { data: existing } = await db
        .from("app_documents")
        .select("id")
        .eq("key", config.key)
        .maybeSingle<{ id: string }>();

      if (existing?.id) {
        const { error } = await db
          .from("app_documents")
          .update({ data: value as Json })
          .eq("key", config.key);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db
          .from("app_documents")
          .insert({ key: config.key, data: value as Json });
        if (error) throw new Error(error.message);
      }
      return value;
    },
  };
}
