/**
 * Client-side offline sale queue. Failed POSTs are stored in localStorage and
 * flushed when the browser comes back online.
 */

const QUEUE_KEY = "grabber-pos-offline-sales";

export interface QueuedSale {
  id: string;
  body: unknown;
  queuedAt: string;
}

function readQueue(): QueuedSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedSale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedSale[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export function enqueueFailedSale(body: unknown): QueuedSale {
  const item: QueuedSale = {
    id: "Q-" + crypto.randomUUID().slice(0, 8),
    body,
    queuedAt: new Date().toISOString(),
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
  return item;
}

export function pendingOfflineCount(): number {
  return readQueue().length;
}

export async function flushOfflineSales(): Promise<{
  sent: number;
  remaining: number;
}> {
  const q = readQueue();
  if (q.length === 0) return { sent: 0, remaining: 0 };
  const remaining: QueuedSale[] = [];
  let sent = 0;
  for (const item of q) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      const json = await res.json();
      if (json.success) sent += 1;
      else remaining.push(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return { sent, remaining: remaining.length };
}
