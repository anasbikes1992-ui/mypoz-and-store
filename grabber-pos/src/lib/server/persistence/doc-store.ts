import "server-only";
import { resolveDb } from "./backend";
import { dataFile, readJsonFile, writeJsonFile } from "./local-json";
import type { Json } from "@/lib/supabase/database.types";

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
        await writeJsonFile(file, value);
        return value;
      }

      const { error } = await db
        .from("app_documents")
        .upsert(
          // Documents are plain config objects — JSON-serializable by contract.
          { key: config.key, data: value as Json },
          { onConflict: "org_id,key" },
        );
      if (error) throw new Error(error.message);
      return value;
    },
  };
}
