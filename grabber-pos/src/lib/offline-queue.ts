/**
 * Client-side offline sale queue — pilot only.
 *
 * Production must not enqueue or flush sales unless explicitly opted in.
 * Enable with NEXT_PUBLIC_ALLOW_OFFLINE_POS=true.
 *
 * Uses IndexedDB (not localStorage) for durability across tab restarts.
 */

const DB_NAME = "grabber-pos-offline";
const STORE_NAME = "sales";
const LEGACY_KEY = "grabber-pos-offline-sales";

export interface QueuedSale {
  id: string;
  body: unknown;
  queuedAt: string;
  clientUuid: string;
}

function offlinePosAllowed(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_OFFLINE_POS === "true";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function readQueue(): Promise<QueuedSale[]> {
  if (typeof window === "undefined" || !offlinePosAllowed()) return [];
  try {
    const db = await openDb();
    return await new Promise<QueuedSale[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
      req.onsuccess = () => resolve((req.result as QueuedSale[]) ?? []);
    });
  } catch {
    return [];
  }
}

async function writeQueue(items: QueuedSale[]): Promise<void> {
  if (!offlinePosAllowed()) {
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
  });
}

async function migrateLegacyQueue(): Promise<void> {
  if (!offlinePosAllowed()) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as QueuedSale[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const existing = await readQueue();
    if (existing.length > 0) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    const migrated = parsed.map((item) => ({
      ...item,
      clientUuid: item.clientUuid || item.id,
    }));
    await writeQueue(migrated);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function isOfflinePosEnabled(): boolean {
  return offlinePosAllowed();
}

export async function enqueueFailedSale(body: unknown): Promise<QueuedSale | null> {
  if (!offlinePosAllowed()) return null;
  await migrateLegacyQueue();
  const item: QueuedSale = {
    id: "Q-" + crypto.randomUUID().slice(0, 8),
    clientUuid: crypto.randomUUID(),
    body,
    queuedAt: new Date().toISOString(),
  };
  const q = await readQueue();
  q.push(item);
  await writeQueue(q);
  return item;
}

export async function pendingOfflineCount(): Promise<number> {
  await migrateLegacyQueue();
  const q = await readQueue();
  return q.length;
}

/** Sync count for callers that cannot await (shows 0 until hydrated). */
export function pendingOfflineCountSync(): number {
  return 0;
}

export async function flushOfflineSales(): Promise<{
  sent: number;
  remaining: number;
  disabled?: boolean;
}> {
  if (!offlinePosAllowed()) {
    await writeQueue([]);
    return { sent: 0, remaining: 0, disabled: true };
  }
  await migrateLegacyQueue();
  const q = await readQueue();
  if (q.length === 0) return { sent: 0, remaining: 0 };
  const remaining: QueuedSale[] = [];
  let sent = 0;
  for (const item of q) {
    try {
      const payload =
        typeof item.body === "object" && item.body !== null
          ? { ...(item.body as Record<string, unknown>), clientUuid: item.clientUuid }
          : item.body;
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) sent += 1;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
  return { sent, remaining: remaining.length };
}
