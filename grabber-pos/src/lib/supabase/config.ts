/**
 * Central switch for the data backend.
 *
 * When Supabase env vars are present the app uses the durable Supabase
 * system-of-record. Otherwise it falls back to the bundled local JSON store
 * so the project still runs out-of-the-box for evaluation and offline dev.
 *
 * Production gates (fail closed — no demo leakage):
 * - `next.config.ts` throws during Vercel Production builds if keys missing
 * - `src/instrumentation.ts` throws on production runtime boot if keys missing
 * - `requireSupabase` blocks request-path JSON fallbacks
 * Opt-in demo only: `POS_ALLOW_DEMO=true`
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** Anon key; also accepts Supabase Vercel integration's PUBLISHABLE_KEY alias. */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Production must not silently serve the bundled JSON demo store when Supabase
 * is missing or unreachable — that risks showing demo data (or a shared local
 * store) as if it were the tenant's real, isolated data. A production deploy is
 * therefore required to have Supabase configured, unless the operator opts in to
 * a demo deploy explicitly with `POS_ALLOW_DEMO=true`.
 */
const allowDemoFallback = process.env.POS_ALLOW_DEMO === "true";
// Skip the guard during `next build` prerender: env may legitimately be absent
// at build time on preview (Production is gated in next.config.ts instead).
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
export const requireSupabase =
  process.env.NODE_ENV === "production" && !allowDemoFallback && !isBuildPhase;
