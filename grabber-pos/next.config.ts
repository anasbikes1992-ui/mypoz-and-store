import type { NextConfig } from "next";
import path from "node:path";

/**
 * Fail closed at config/build time for Vercel Production: never ship a build
 * that can fall back to the bundled demo JSON store.
 * Opt out only with POS_ALLOW_DEMO=true (intentional demo deploys).
 */
function assertProductionSupabaseEnv(): void {
  if (process.env.POS_ALLOW_DEMO === "true") return;
  if (process.env.VERCEL_ENV !== "production") return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!service) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length === 0) return;

  throw new Error(
    `[MyPoz] Production build refused — missing ${missing.join(", ")}. ` +
      `Set these on the Vercel Production environment, or set POS_ALLOW_DEMO=true only for intentional demo deploys.`,
  );
}

assertProductionSupabaseEnv();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      // Previous concatenated paths → Grabber product routes
      { source: "/cashin", destination: "/cash-in", permanent: true },
      { source: "/cashout", destination: "/cash-out", permanent: true },
      { source: "/updates", destination: "/help", permanent: true },
    ];
  },
  async rewrites() {
    return [
      // Fail-closed WAF: Next may serve dotfiles directly before middleware,
      // so we hard-deny /.env at the edge.
      { source: "/.env", destination: "/api/waf-deny" },
    ];
  },
};

export default nextConfig;
