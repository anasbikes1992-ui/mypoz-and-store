import "server-only";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";
import { LocalRepository } from "./local";
import { SupabaseRepository } from "./supabase";
import type { PosRepository } from "./types";

/**
 * Resolve the active data backend for the current request.
 * Supabase when configured (and the user has a branch), else the local store.
 */
export async function getRepository(): Promise<PosRepository> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      // Fail loud in production instead of serving the bundled demo store.
      throw new Error(
        "Supabase is not configured, but this is a production deploy. Set " +
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set " +
          "POS_ALLOW_DEMO=true to intentionally run the local demo store.",
      );
    }
    return new LocalRepository();
  }

  const db = await createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new LocalRepository();

  // Resolve the caller's active branch (first active branch in their org).
  const { data: branch } = await db
    .from("branches")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!branch) return new LocalRepository();
  return new SupabaseRepository(db, branch.id);
}

export type { PosRepository } from "./types";
