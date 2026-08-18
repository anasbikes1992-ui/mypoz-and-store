import "server-only";
import { randomUUID } from "crypto";
import { recordStore, type RecordStore } from "./persistence/record-store";

/**
 * Generic CRUD store for the simple management collections (categories, brands,
 * suppliers, customers, expenses, …). Persistence is delegated to the record
 * store seam: one JSON file per collection locally, one RLS-scoped
 * `app_collections` row per record in the durable backend.
 *
 * Collection names come from the COLLECTIONS registry in `lib/collections.ts`
 * (API routes reject anything else), so they never collide with the module
 * stores, which use hyphenated names.
 */
export interface Entity {
  id: string;
  createdAt: string;
  [key: string]: unknown;
}

const stores = new Map<string, RecordStore<Entity>>();

function storeFor(name: string): RecordStore<Entity> {
  let store = stores.get(name);
  if (!store) {
    store = recordStore<Entity>({
      collection: name,
      file: `collection-${name}.json`,
    });
    stores.set(name, store);
  }
  return store;
}

export async function listCollection(name: string): Promise<Entity[]> {
  const items = await storeFor(name).list();
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getEntity(
  name: string,
  id: string,
): Promise<Entity | null> {
  return storeFor(name).get(id);
}

export async function createEntity(
  name: string,
  data: Record<string, unknown>,
): Promise<Entity> {
  const entity: Entity = {
    ...data,
    id: name.slice(0, 3).toUpperCase() + "-" + randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
  };
  return storeFor(name).put(entity);
}

export async function updateEntity(
  name: string,
  id: string,
  data: Record<string, unknown>,
): Promise<Entity | null> {
  const store = storeFor(name);
  const existing = await store.get(id);
  if (!existing) return null;
  return store.put({ ...existing, ...data, id, createdAt: existing.createdAt });
}

export async function deleteEntity(name: string, id: string): Promise<boolean> {
  return storeFor(name).remove(id);
}
