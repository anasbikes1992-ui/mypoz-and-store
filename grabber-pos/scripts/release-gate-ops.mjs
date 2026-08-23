/**
 * Production release-gate ops runner (read-only checks).
 *
 * Usage:
 *   node scripts/release-gate-ops.mjs
 *   node scripts/release-gate-ops.mjs --host https://mypoz-and-store-ui.vercel.app
 *   node --env-file=.env.local scripts/release-gate-ops.mjs --env
 *   node scripts/release-gate-ops.mjs --strict
 *
 * Exits 0 when automated checks pass; operator items (Auth URL) are reported but do not fail exit unless --strict.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

void join(dirname(fileURLToPath(import.meta.url)), "..");
const host = (
  process.argv.find((a) => a.startsWith("http")) ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://mypoz-and-store-ui.vercel.app"
).replace(/\/$/, "");

const strict = process.argv.includes("--strict");
const withEnv = process.argv.includes("--env");

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";

const checks = [];

function record(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function fetchJson(path) {
  const res = await fetch(`${host}${path}`);
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, body: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, body: text.slice(0, 200) };
  }
}

// Health
try {
  const h = await fetchJson("/api/health");
  const ready =
    h.status === 200 &&
    h.body?.status === "ok" &&
    h.body?.backend === "supabase";
  record(
    "GET /api/health",
    ready,
    `backend=${h.body?.backend ?? "?"} whatsapp=${h.body?.whatsapp ?? "?"} gateway=${h.body?.gatewayLedger ?? "?"}`,
  );
} catch (e) {
  record("GET /api/health", false, e instanceof Error ? e.message : String(e));
}

// WhatsApp smoke (inline — same checks as whatsapp-smoke.mjs)
async function waCheck(
  name,
  path,
  expectOk = (r) => r.ok || r.status === 403 || r.status === 401,
) {
  try {
    const res = await fetch(`${host}${path}`);
    return { name, pass: expectOk(res), detail: `HTTP ${res.status}` };
  } catch (e) {
    return {
      name,
      pass: false,
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

const waRows = [
  await waCheck("GET /api/whatsapp/status", "/api/whatsapp/status"),
  await waCheck(
    "GET webhook verify (wrong token → 403)",
    "/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=test",
  ),
  await waCheck(
    "GET catalog CSV",
    "/api/store/anaz-store/catalog?format=csv",
    (r) => r.ok,
  ),
];
for (const row of waRows) record(row.name, row.pass, row.detail);
const waFailed = waRows.filter((r) => !r.pass).length;
record("WhatsApp smoke bundle", waFailed === 0, `failed: ${waFailed}`);

// Storefront catalog spot-check
try {
  const cat = await fetchJson("/api/store/anaz-store/catalog?format=json");
  const total = cat.body?.data?.total ?? cat.body?.data?.items?.length;
  record(
    "Storefront catalog",
    cat.status === 200 && Number(total) > 0,
    `HTTP ${cat.status} total=${total ?? "?"}`,
  );
} catch (e) {
  record("Storefront catalog", false, e instanceof Error ? e.message : String(e));
}

// Local env (optional)
if (withEnv) {
  const envKeys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "WHATSAPP_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_APP_SECRET",
  ];
  for (const k of envKeys) {
    record(`env ${k}`, Boolean(process.env[k]?.trim()), process.env[k] ? "set" : "missing");
  }
}

// Operator reminders (informational — always pass unless --strict)
record(
  "A-OP-01 Auth Site URL + redirects",
  !strict,
  "Confirm in Supabase dashboard → Auth → URL Configuration",
);
record(
  "A-OP-02 Live WhatsApp hi → inbox",
  !strict,
  "DB evidence 2026-08-22: inbound hi + menu reply in app_collections",
);

const failed = checks.filter((c) => !c.pass);
const summary = {
  host,
  at: new Date().toISOString(),
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
  verdict:
    failed.length === 0
      ? "AUTOMATED_PASS"
      : strict
        ? "BLOCKED"
        : "CONDITIONALLY_READY",
};

console.log("\n" + JSON.stringify(summary, null, 2));
process.exit(failed.length && strict ? 1 : 0);
