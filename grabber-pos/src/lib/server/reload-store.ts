import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

/** Recent mobile-reload log (the sale itself is the financial record). */
export interface ReloadEntry {
  id: string;
  provider: string;
  mobile: string;
  amount: number;
  saleId: string;
  createdAt: string;
}

const store = recordStore<ReloadEntry>({
  collection: "reload-log",
  file: "reloads.json",
});

export async function listReloads(limit = 20): Promise<ReloadEntry[]> {
  return (await store.list())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function logReload(
  entry: Omit<ReloadEntry, "id" | "createdAt">,
): Promise<ReloadEntry> {
  // Random id rather than a count-derived sequence: two reloads logged at the
  // same moment would otherwise collide on "RL-0000N" and overwrite each other.
  return store.put({
    ...entry,
    id: "RL-" + randomUUID().slice(0, 8),
    createdAt: new Date().toISOString(),
  });
}
