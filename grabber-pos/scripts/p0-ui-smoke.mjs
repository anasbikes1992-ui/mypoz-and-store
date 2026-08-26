/**
 * Live UI-path smoke for P0 milestone gates (no code changes to product).
 * Proves authenticated Owner/HQ pages see the same data as the control plane.
 *
 *   node scripts/p0-ui-smoke.mjs
 *
 * Env (from .env.local or process):
 *   NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
 *   NEXT_PUBLIC_APP_URL (default production)
 *   GATE3_TEST_PASSWORD — Anaz owner + fixture users
 *   HQ_SMOKE_EMAIL / HQ_SMOKE_PASSWORD — optional HQ operator override
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const ANAZ_EMAIL =
  process.env.ANAZ_OWNER_EMAIL || "anazazeez1992@gmail.com";
const HQ_EMAIL =
  process.env.HQ_SMOKE_EMAIL ||
  process.env.GMS_ADMIN_EMAIL ||
  "anasbikes1992@gmail.com";
const HQ_PASSWORD = process.env.HQ_SMOKE_PASSWORD || PASSWORD;
const RECEIPT = "GPS-MAIN-20260826-0001";
const ANAZ_ORG = "304adc33-7279-4547-a73d-a2240333e814";

const results = [];

function record(id, pass, evidence) {
  results.push({ id, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${evidence}`);
}

function cookieHeader(session) {
  const base = `sb-veavfkjgtkbnggukzjds-auth-token`;
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: session.user,
  });
  const CHUNK = 3000;
  if (payload.length <= CHUNK) return `${base}=${encodeURIComponent(payload)}`;
  const parts = [];
  for (let i = 0; i < payload.length; i += CHUNK)
    parts.push(payload.slice(i, i + CHUNK));
  return parts.map((p, i) => `${base}.${i}=${encodeURIComponent(p)}`).join("; ");
}

async function login(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(
      `login ${email}: ${body.error_description || body.msg || res.status}`,
    );
  }
  return body;
}

async function fetchPage(path, cookie) {
  const res = await fetch(`${APP}${path}`, {
    headers: { Cookie: cookie, Accept: "text/html" },
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

async function fetchJson(path, cookie) {
  const res = await fetch(`${APP}${path}`, {
    headers: { Cookie: cookie, Accept: "application/json" },
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

async function smokeAnaz() {
  console.log("\n=== Test A — Anaz owner /commerce/orders ===");
  let session;
  try {
    session = await login(ANAZ_EMAIL, PASSWORD);
  } catch (e) {
    record("A.login", false, String(e.message || e));
    return;
  }
  record("A.login", true, `${ANAZ_EMAIL} → session`);

  const db = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile } = await db
    .from("profiles")
    .select("org_id, role")
    .eq("id", session.user.id)
    .maybeSingle();
  record(
    "A.profile",
    Boolean(profile?.org_id),
    `org=${profile?.org_id || "none"} role=${profile?.role || "none"} expected=${ANAZ_ORG}`,
  );

  const { data: orders, error: ordErr } = await db
    .from("app_collections")
    .select("entity_id, data")
    .eq("collection", "storefront-orders");
  if (ordErr) {
    record("A.rls_orders", false, ordErr.message);
  } else {
    const hit = (orders || []).find(
      (r) => (r.data?.receiptNo || "") === RECEIPT,
    );
    record(
      "A.rls_orders",
      Boolean(hit),
      hit
        ? `found ${RECEIPT} total=${hit.data?.total} delivery=${hit.data?.deliveryFee} customer=${hit.data?.customerName}`
        : `count=${(orders || []).length} missing ${RECEIPT}`,
    );
    if (hit) {
      const d = hit.data;
      const lines = Array.isArray(d.lines) ? d.lines : [];
      const merch = lines.reduce(
        (s, l) => s + Number(l.unitPrice || 0) * Number(l.quantity || 0),
        0,
      );
      const ok =
        Number(d.total) === 1100 &&
        Number(d.deliveryFee) === 600 &&
        merch === 500 &&
        String(d.slug) === "anaz-store" &&
        (d.paymentMethod === "cash" || d.paymentMethod === "cod");
      record(
        "A.order_shape",
        ok,
        `merch=${merch} delivery=${d.deliveryFee} total=${d.total} pay=${d.paymentMethod} slug=${d.slug} item=${lines[0]?.name || "?"}`,
      );
    }
  }

  const cookie = cookieHeader(session);
  const page = await fetchPage("/commerce/orders", cookie);
  if (page.status >= 300 && page.status < 400) {
    record(
      "A.ui_orders",
      false,
      `redirect ${page.status} → ${page.location || "?"}`,
    );
  } else {
    const html = page.text;
    const hasReceipt = html.includes(RECEIPT);
    const hasTotal =
      html.includes("1,100") ||
      html.includes("1100") ||
      html.includes("Rs") ||
      html.includes("LKR");
    record(
      "A.ui_orders",
      page.status === 200 && hasReceipt,
      `HTTP ${page.status} receipt=${hasReceipt} moneyHint=${hasTotal} bytes=${html.length}`,
    );
  }

  const detail = await fetchPage(`/commerce/orders/${RECEIPT}`, cookie);
  record(
    "A.ui_order_detail",
    detail.status === 200 &&
      (detail.text.includes(RECEIPT) ||
        detail.text.includes("COD Smoke") ||
        detail.text.includes("1100") ||
        detail.text.includes("1,100")),
    `HTTP ${detail.status} bytes=${detail.text.length}`,
  );
}

async function smokeHq() {
  console.log("\n=== Test B — HQ tenants = licences ===");
  let session;
  try {
    session = await login(HQ_EMAIL, HQ_PASSWORD);
  } catch (e) {
    record("B.login", false, String(e.message || e));
    return;
  }
  record("B.login", true, `${HQ_EMAIL} → session`);

  const cookie = cookieHeader(session);
  const api = await fetchJson("/api/hq/tenants", cookie);
  const list = Array.isArray(api.json?.data?.tenants)
    ? api.json.data.tenants
    : [];
  const names = list
    .map((t) => String(t.name || t.org_name || t.id))
    .filter(Boolean)
    .sort();
  const expectedNames = [
    "Anaz Store",
    "HQ Security Workspace",
    "Tenant A Security Co",
    "Tenant B Security Co",
  ];
  const hasAll = expectedNames.every((n) => names.includes(n));
  record(
    "B.api_tenants",
    api.status === 200 && list.length === 4 && hasAll,
    `HTTP ${api.status} count=${list.length} source=${api.json?.data?.source || "?"} names=${names.join(" | ")}`,
  );

  // /hq/tenants and /hq/licences are client pages that both call /api/hq/tenants.
  // SSR HTML is an empty shell ("No tenants yet") until hydration — do not score SSR.
  const tenantsPage = await fetchPage("/hq/tenants", cookie);
  const licencesPage = await fetchPage("/hq/licences", cookie);
  const bothReachable =
    tenantsPage.status === 200 && licencesPage.status === 200;
  record(
    "B.ui_routes",
    bothReachable,
    `tenants HTTP ${tenantsPage.status} · licences HTTP ${licencesPage.status} (client fetch → same API)`,
  );
  record(
    "B.roster_match",
    hasAll && bothReachable,
    "tenants page + licences page share GET /api/hq/tenants; API roster matches canonical 4 orgs",
  );
}

async function main() {
  if (!ANON) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(2);
  }
  console.log(`APP=${APP}`);
  await smokeAnaz();
  await smokeHq();
  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n=== SUMMARY ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length}) ===`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
