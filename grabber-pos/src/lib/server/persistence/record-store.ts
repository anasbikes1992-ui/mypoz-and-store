import "server-only";
import { resolveDb } from "./backend";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "./local-json";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Records are plain data objects persisted as jsonb — JSON-serializable by
 * contract, which the compiler can't prove for an arbitrary `T`.
 */
function asJson(value: unknown): Json {
  return value as Json;
}

/**
 * Dual-path store for keyed records (delivery orders, jobs, bookings, hire
 * purchase agreements, purchase orders, play sessions, reload log, generic
 * collections, live restaurant orders).
 *
 * - Local/demo backend: one JSON array per module under `data/`.
 * - Supabase backend: one row per record in `app_collections`, scoped to the
 *   caller's organization by RLS. Writing a single record instead of the whole
 *   array is what makes concurrent edits to *different* records safe.
 *
 * The API is identical either way, so callers hold no backend knowledge.
 */
export interface KeyedRecord {
  id: string;
}

export interface RecordStore<T extends KeyedRecord> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  /** Insert or replace one record. */
  put(item: T): Promise<T>;
  /** Insert or replace many records in one round-trip. */
  putMany(items: T[]): Promise<T[]>;
  remove(id: string): Promise<boolean>;
}

export interface RecordStoreConfig {
  /** Logical collection name — the `app_collections.collection` value. */
  collection: string;
  /** File name under `data/` for the local backend. */
  file: string;
}

/**
 * Coerce a parsed JSON file into a record array. Tolerates the legacy
 * map-shaped files (`{ "<id>": {...} }`) some modules wrote before this seam.
 */
function toRecords<T extends KeyedRecord>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, object>).map(
      ([id, value]) => ({ id, ...value }) as T,
    );
  }
  return [];
}

export function recordStore<T extends KeyedRecord>(
  config: RecordStoreConfig,
): RecordStore<T> {
  const file = dataFile(config.file);

  const readLocal = async (): Promise<T[]> =>
    toRecords<T>(await readJsonFile<unknown>(file, []));

  return {
    async list() {
      const db = await resolveDb();
      if (!db) return readLocal();

      const { data, error } = await db
        .from("app_collections")
        .select("data")
        .eq("collection", config.collection);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.data as unknown as T);
    },

    async get(id) {
      const db = await resolveDb();
      if (!db) return (await readLocal()).find((r) => r.id === id) ?? null;

      const { data, error } = await db
        .from("app_collections")
        .select("data")
        .eq("collection", config.collection)
        .eq("entity_id", id)
        .maybeSingle<{ data: unknown }>();
      if (error) throw new Error(error.message);
      return (data?.data as T | undefined) ?? null;
    },

    async put(item) {
      const db = await resolveDb();
      if (!db) {
        return withFileLock(file, async () => {
          const items = await readLocal();
          const exists = items.some((r) => r.id === item.id);
          await writeJsonFile(
            file,
            exists
              ? items.map((r) => (r.id === item.id ? item : r))
              : [...items, item],
          );
          return item;
        });
      }

      // RLS fills org_id from the session, but PostgREST requires it in the
      // VALUES row for the ON CONFLICT target. Use select+update/insert instead.
      const { data: existing } = await db
        .from("app_collections")
        .select("id")
        .eq("collection", config.collection)
        .eq("entity_id", item.id)
        .maybeSingle<{ id: string }>();

      if (existing?.id) {
        const { error } = await db
          .from("app_collections")
          .update({ data: asJson(item) })
          .eq("collection", config.collection)
          .eq("entity_id", item.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db
          .from("app_collections")
          .insert({ collection: config.collection, entity_id: item.id, data: asJson(item) });
        if (error) throw new Error(error.message);
      }
      return item;
    },

    async putMany(items) {
      if (items.length === 0) return items;
      const db = await resolveDb();
      if (!db) {
        return withFileLock(file, async () => {
          const existing = await readLocal();
          const byId = new Map(existing.map((r) => [r.id, r]));
          for (const item of items) byId.set(item.id, item);
          await writeJsonFile(file, [...byId.values()]);
          return items;
        });
      }

      // Batch: fetch existing entity_ids for this collection, then split into
      // inserts and updates to avoid the org_id conflict issue.
      const entityIds = items.map((i) => i.id);
      const { data: existing } = await db
        .from("app_collections")
        .select("entity_id")
        .eq("collection", config.collection)
        .in("entity_id", entityIds);
      const existingIds = new Set((existing ?? []).map((r: { entity_id: string }) => r.entity_id));

      const toInsert = items.filter((i) => !existingIds.has(i.id));
      const toUpdate = items.filter((i) => existingIds.has(i.id));

      if (toInsert.length > 0) {
        const { error } = await db.from("app_collections").insert(
          toInsert.map((item) => ({
            collection: config.collection,
            entity_id: item.id,
            data: asJson(item),
          })),
        );
        if (error) throw new Error(error.message);
      }
      for (const item of toUpdate) {
        const { error } = await db
          .from("app_collections")
          .update({ data: asJson(item) })
          .eq("collection", config.collection)
          .eq("entity_id", item.id);
        if (error) throw new Error(error.message);
      }
      return items;
    },

    async remove(id) {
      const db = await resolveDb();
      if (!db) {
        return withFileLock(file, async () => {
          const items = await readLocal();
          if (!items.some((r) => r.id === id)) return false;
          await writeJsonFile(
            file,
            items.filter((r) => r.id !== id),
          );
          return true;
        });
      }

      const { data, error } = await db
        .from("app_collections")
        .delete()
        .eq("collection", config.collection)
        .eq("entity_id", id)
        .select("entity_id");
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
  };
}
