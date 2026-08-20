/**
 * Go-live smoke against local env (and optionally production health URL).
 * Usage: node --env-file=.env.local scripts/go-live-smoke.mjs
 * Never logs secrets.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";

const checks = [];

function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "OK  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

ok(
  "NEXT_PUBLIC_SUPABASE_URL",
  /veavfkjgtkbnggukzjds\.supabase\.co/.test(url),
  url ? "points at new project" : "missing",
);
ok("NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(anon), anon ? "set" : "missing");
ok("SUPABASE_SERVICE_ROLE_KEY", Boolean(service), service ? "set" : "missing");
ok(
  "NEXT_PUBLIC_APP_URL host",
  /mypoz-and-store-ui\.vercel\.app/.test(appUrl) || appUrl.includes("localhost"),
  appUrl,
);

if (url && anon) {
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anon },
    });
    ok("Supabase Auth health", res.ok || res.status === 200, `HTTP ${res.status}`);
  } catch (e) {
    ok("Supabase Auth health", false, e instanceof Error ? e.message : String(e));
  }
}

try {
  const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/health`);
  const body = await res.json().catch(() => ({}));
  const ready =
    res.ok &&
    body?.status === "ok" &&
    body?.backend === "supabase";
  ok(
    "Production /api/health",
    ready,
    res.status === 401 || res.status === 403
      ? "blocked by Vercel Deployment Protection — check in browser while logged in"
      : `HTTP ${res.status} backend=${body?.backend ?? "?"} gateway=${body?.gatewayLedger ?? "?"}`,
  );
} catch (e) {
  ok("Production /api/health", false, e instanceof Error ? e.message : String(e));
}

console.log("\nNext: configure Auth Site URL + redirects in Supabase dashboard,");
console.log("then: node --env-file=.env.local scripts/upsert-admin.mjs");

const failed = checks.filter((c) => !c.pass).length;
process.exit(failed ? 1 : 0);
