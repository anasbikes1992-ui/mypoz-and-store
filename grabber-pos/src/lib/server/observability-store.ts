import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import {
  isSupabaseEnabled,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";
import { recordStore } from "./persistence/record-store";
import { resolveDb } from "./persistence/backend";
import type { ReplayFrame, StoredUxEvent, UxEvent, UxEventKind } from "@/lib/observability";

export type { StoredUxEvent };

const MAX_EVENTS = 400;
const store = recordStore<StoredUxEvent>({
  collection: "ux-events",
  file: "ux-events.json",
});

function clipReplay(frames: ReplayFrame[] | undefined): ReplayFrame[] {
  return (frames ?? []).slice(-40).map((f) => ({
    t: Number(f.t) || 0,
    type: f.type,
    path: String(f.path || "/").slice(0, 200),
    tag: f.tag?.slice(0, 80),
    x: typeof f.x === "number" ? Math.round(f.x) : undefined,
    y: typeof f.y === "number" ? Math.round(f.y) : undefined,
    detail: f.detail?.slice(0, 120),
  }));
}

function normalize(
  input: Partial<UxEvent> & { id?: string },
): StoredUxEvent {
  return {
    id: input.id || `ux_${randomUUID().slice(0, 12)}`,
    sessionId: String(input.sessionId || "").slice(0, 80),
    kind: (input.kind as UxEventKind) || "error",
    path: String(input.path || "/").slice(0, 200),
    message: String(input.message || "").slice(0, 500),
    replay: clipReplay(input.replay),
    at: input.at || new Date().toISOString(),
    slug: String(input.slug || "").slice(0, 80),
  };
}

export async function listUxEvents(): Promise<StoredUxEvent[]> {
  const rows = await store.list();
  return rows
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_EVENTS);
}

export async function ingestUxEvent(
  input: Partial<UxEvent>,
  opts: { slug?: string; host?: string } = {},
): Promise<StoredUxEvent> {
  const row = normalize({ ...input, slug: input.slug || opts.slug });
  const db = await resolveDb();
  if (db) {
    await store.put(row);
    return row;
  }
  if (!isSupabaseEnabled) {
    await store.put(row);
    return row;
  }
  if (opts.slug) {
    const ingested = await ingestPublic(row, opts.slug, opts.host ?? "");
    if (ingested) return row;
  }
  return row;
}

async function ingestPublic(
  row: StoredUxEvent,
  slug: string,
  host: string,
): Promise<boolean> {
  try {
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await anon.rpc("storefront_ingest_ux_event", {
      p_host: host,
      p_slug: slug,
      p_payload: row as unknown as Json,
    });
    if (!error) return true;
  } catch {
    /* RPC not applied yet */
  }
  return false;
}
