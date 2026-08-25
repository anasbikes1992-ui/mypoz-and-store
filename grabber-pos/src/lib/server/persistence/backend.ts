import "server-only";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export type Db = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Resolve the persistence backend for this request.
 *
 * Returns a request-scoped Supabase client when Supabase is configured AND the
 * caller is authenticated; otherwise `null` in demo mode only.
 *
 * Production (requireSupabase): never returns null — throws so callers cannot
 * silently fall through to local JSON.
 */
export async function resolveDb(): Promise<Db | null> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      throw new Error(
        "DEPENDENCY_UNAVAILABLE: Supabase is not configured on this production deploy.",
      );
    }
    return null;
  }
  try {
    const db = await createServerSupabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (user) return db;
    if (requireSupabase) {
      throw new Error("Unauthorized");
    }
    return null;
  } catch (err) {
    if (requireSupabase) {
      throw err instanceof Error ? err : new Error("Supabase auth failed");
    }
    return null;
  }
}
