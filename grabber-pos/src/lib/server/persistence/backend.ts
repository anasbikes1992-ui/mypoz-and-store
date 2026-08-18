import "server-only";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export type Db = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Resolve the persistence backend for this request.
 *
 * Returns a request-scoped Supabase client when Supabase is configured AND the
 * caller is authenticated; otherwise `null`, meaning "use the local JSON store".
 * Org scoping is handled by the tables themselves (`org_id default
 * current_org_id()` + RLS), so no branch lookup is needed here.
 */
export async function resolveDb(): Promise<Db | null> {
  if (!isSupabaseEnabled) {
    if (requireSupabase) {
      // Fail loud: a production deploy without Supabase must not quietly serve
      // the bundled JSON demo store as if it were real tenant data.
      throw new Error(
        "Supabase is not configured, but this is a production deploy. Set " +
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set " +
          "POS_ALLOW_DEMO=true to intentionally run the local demo store.",
      );
    }
    return null;
  }
  try {
    const db = await createServerSupabase();
    const {
      data: { user },
    } = await db.auth.getUser();
    return user ? db : null;
  } catch (err) {
    if (requireSupabase) {
      // In production, a transient/unreachable backend must surface as an error
      // rather than silently falling through to the local demo store.
      throw err instanceof Error ? err : new Error("Supabase auth failed");
    }
    // Dev/demo: fail soft to the local store rather than taking the module down.
    return null;
  }
}
