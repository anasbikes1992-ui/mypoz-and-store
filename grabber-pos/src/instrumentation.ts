/**
 * Runtime production gate: refuse to boot without Supabase when not a demo deploy.
 * Complements next.config.ts build-time check (VERCEL_ENV=production).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.POS_ALLOW_DEMO === "true") return;

  const isProdRuntime =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  if (!isProdRuntime) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  if (url && anon) return;

  throw new Error(
    "[MyPoz] Production runtime refused — Supabase URL/anon key missing. " +
      "Demo JSON fallback is disabled unless POS_ALLOW_DEMO=true.",
  );
}
