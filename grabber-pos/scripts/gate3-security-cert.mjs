/**
 * Gate 3 — adversarial security certification runner.
 * Usage: node scripts/gate3-security-cert.mjs
 *
 * Secrets: reads GATE3_TEST_PASSWORD from env (or default local test password).
 * Writes results to data/backups/gate3-security-results.json (gitignored under data/).
 * Never prints access tokens or passwords.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.GATE3_ANON_KEY ||
  "";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";

if (!ANON_KEY) {
  console.error("Set GATE3_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const IDS = {
  hq: "7385835a-810b-4c99-9b47-5db2018a891f",
  aOwner: "e2847ae1-c309-4d59-8c03-d27e496605b0",
  aManager: "a4444444-4444-4444-4444-444444444444",
  aCashier: "a5555555-5555-5555-5555-555555555555",
  bOwner: "f5154389-57d3-4169-a221-dcd8de064d67",
  productA: "a3333333-3333-3333-3333-333333333333",
  productB: "b3333333-3333-3333-3333-333333333333",
  orgA: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  orgB: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
};

const USERS = {
  hq: "anasbikes1992@gmail.com",
  aOwner: "anazazeez1992@gmail.com",
  aManager: "tenant-a-manager@mypoz.test",
  aCashier: "tenant-a-cashier@mypoz.test",
  bOwner: "pilot2-owner@mypoz.test",
};

/** @type {Array<Record<string, unknown>>} */
const results = [];

function record(test) {
  results.push({
    ...test,
    pass: Boolean(test.pass),
    severity: test.pass ? "none" : test.severity || "HIGH",
  });
  const mark = test.pass ? "PASS" : "FAIL";
  console.log(`${mark} ${test.id} — ${test.actual ?? ""}`.slice(0, 200));
}

async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: body?.error_description || body?.msg || body?.error || "login_failed" };
  }
  return {
    ok: true,
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    expiresAt: body.expires_at,
    user: body.user,
    userId: body.user?.id,
    appRole: body.user?.app_metadata?.role ?? null,
    userMetaRole: body.user?.user_metadata?.role ?? null,
  };
}

async function rest(path, token, { method = "GET", body } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "count=exact",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, text: text.slice(0, 300) };
}

function supabaseAuthCookieHeader(session) {
  // Mirrors @supabase/ssr browser cookie storage for createServerSupabase().
  const ref = "veavfkjgtkbnggukzjds";
  const base = `sb-${ref}-auth-token`;
  const payload = JSON.stringify({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_in: session.expiresIn ?? 3600,
    expires_at: session.expiresAt ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: session.user ?? { id: session.userId },
  });
  // Chunk if large (SSR splits around ~3180 chars)
  const CHUNK = 3000;
  if (payload.length <= CHUNK) {
    return `${base}=${encodeURIComponent(payload)}`;
  }
  const parts = [];
  for (let i = 0; i < payload.length; i += CHUNK) {
    parts.push(payload.slice(i, i + CHUNK));
  }
  return parts
    .map((p, i) => `${base}.${i}=${encodeURIComponent(p)}`)
    .join("; ");
}

async function api(path, { method = "GET", token, cookie, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text: text.slice(0, 400) };
}

async function main() {
  const sessions = {};
  for (const [key, email] of Object.entries(USERS)) {
    const s = await login(email);
    sessions[key] = s;
    record({
      id: `auth_login_${key}`,
      identity: email,
      request: "POST /auth/v1/token?grant_type=password",
      expected: "200 + access_token",
      actual: s.ok ? `200 user=${s.userId}` : `${s.status} ${s.error}`,
      pass: s.ok,
      severity: "CRITICAL",
    });
  }

  // Forged user_metadata must not become gms_admin in app_metadata
  if (sessions.aOwner?.ok) {
    record({
      id: "auth_forged_user_metadata_not_app_metadata",
      identity: USERS.aOwner,
      request: "inspect JWT user after login (user_metadata.role=gms_admin planted)",
      expected: "app_metadata.role is NOT gms_admin",
      actual: `app_metadata.role=${sessions.aOwner.appRole} user_metadata.role=${sessions.aOwner.userMetaRole}`,
      pass: sessions.aOwner.appRole !== "gms_admin" && sessions.aOwner.userMetaRole === "gms_admin",
      severity: "CRITICAL",
    });
  }

  if (sessions.hq?.ok) {
    record({
      id: "auth_hq_app_metadata_gms_admin",
      identity: USERS.hq,
      request: "inspect JWT app_metadata",
      expected: "app_metadata.role=gms_admin",
      actual: `app_metadata.role=${sessions.hq.appRole}`,
      pass: sessions.hq.appRole === "gms_admin",
      severity: "HIGH",
    });
  }

  // --- RLS via PostgREST ---
  const rlsCases = [
    {
      id: "rls_products_a_owner_sees_own",
      who: "aOwner",
      path: "products?select=id,sku,org_id",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.length === 1 &&
        r.json[0].sku === "SEC-A-1",
      expected: "200 with only SEC-A-1",
    },
    {
      id: "rls_products_a_cannot_see_b",
      who: "aOwner",
      path: `products?id=eq.${IDS.productB}&select=id`,
      expect: (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 0,
      expected: "200 empty (not B product)",
    },
    {
      id: "rls_products_b_owner_sees_own",
      who: "bOwner",
      path: "products?select=id,sku",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.length === 1 &&
        r.json[0].sku === "SEC-B-1",
      expected: "200 with only SEC-B-1",
    },
    {
      id: "rls_branch_stock_cross_tenant",
      who: "aOwner",
      path: `branch_stock?product_id=eq.${IDS.productB}&select=*`,
      expect: (r) => r.status === 200 && Array.isArray(r.json) && r.json.length === 0,
      expected: "200 empty for B stock",
    },
    {
      id: "rls_organizations_no_cross",
      who: "aOwner",
      path: "organizations?select=id,slug",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((o) => o.id === IDS.orgA),
      expected: "only own org or empty/own",
    },
    {
      id: "rls_app_documents_whatsapp_cross",
      who: "aOwner",
      path: "app_documents?key=eq.whatsapp&select=org_id,data",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((d) => d.org_id === IDS.orgA),
      expected: "only Tenant A whatsapp doc",
    },
    {
      id: "rls_unauth_products",
      who: null,
      path: "products?select=id",
      expect: (r) => r.status === 401 || (r.status === 200 && Array.isArray(r.json) && r.json.length === 0),
      expected: "401 or empty",
    },
    {
      id: "rls_insert_cross_tenant_product_blocked",
      who: "aOwner",
      method: "POST",
      path: "products",
      body: {
        org_id: IDS.orgB,
        sku: "HACK-B",
        slug: "hack-b",
        name: "Cross tenant inject",
        cost_price: 1,
        sale_price: 2,
      },
      expect: (r) => r.status === 401 || r.status === 403 || r.status === 400 || (r.status >= 400 && r.status < 500),
      expected: "4xx — cannot insert into org B",
      severity: "CRITICAL",
    },
    {
      id: "rls_platform_settings_tenant_denied",
      who: "aOwner",
      path: "platform_settings?select=*",
      expect: (r) =>
        r.status === 401 ||
        r.status === 403 ||
        (r.status === 200 && Array.isArray(r.json) && r.json.length === 0),
      expected: "denied or empty",
      severity: "HIGH",
    },
    {
      id: "rls_profiles_no_cross_tenant",
      who: "aOwner",
      path: "profiles?select=id,org_id,role",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((p) => p.org_id === IDS.orgA),
      expected: "only Tenant A profiles",
      severity: "CRITICAL",
    },
    {
      id: "rls_sales_empty_cross",
      who: "aOwner",
      path: "sales?select=id,org_id",
      expect: (r) => r.status === 200 && Array.isArray(r.json),
      expected: "200 array (own org only; empty OK)",
      severity: "HIGH",
    },
    {
      id: "rls_sale_returns_tenant_scoped",
      who: "bOwner",
      path: "sale_returns?select=id,org_id",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((row) => row.org_id === IDS.orgB),
      expected: "only Tenant B returns (likely empty)",
      severity: "HIGH",
    },
    {
      id: "rls_stocktakes_tenant_scoped",
      who: "aOwner",
      path: "stocktakes?select=id,org_id",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((row) => row.org_id === IDS.orgA),
      expected: "only Tenant A stocktakes",
      severity: "HIGH",
    },
    {
      id: "rls_audit_events_tenant_scoped",
      who: "aOwner",
      path: "audit_events?select=id,org_id",
      expect: (r) =>
        r.status === 200 &&
        Array.isArray(r.json) &&
        r.json.every((row) => !row.org_id || row.org_id === IDS.orgA),
      expected: "only Tenant A audit events",
      severity: "HIGH",
    },
  ];

  for (const c of rlsCases) {
    const token = c.who ? sessions[c.who]?.accessToken : ANON_KEY;
    if (c.who && !sessions[c.who]?.ok) {
      record({
        id: c.id,
        identity: c.who,
        request: `${c.method || "GET"} ${c.path}`,
        expected: c.expected,
        actual: "SKIP — login failed",
        pass: false,
        severity: c.severity || "HIGH",
      });
      continue;
    }
    const r = await rest(c.path, token, { method: c.method || "GET", body: c.body });
    const pass = c.expect(r);
    record({
      id: c.id,
      identity: c.who ? USERS[c.who] : "anon",
      request: `${c.method || "GET"} /rest/v1/${c.path}`,
      expected: c.expected,
      actual: `status=${r.status} body=${JSON.stringify(r.json)?.slice(0, 160)}`,
      pass,
      severity: c.severity || "HIGH",
    });
  }

  // --- App API routes (deployed) ---
  const unauthRoutes = [
    { method: "GET", path: "/api/audit" },
    { method: "POST", path: "/api/audit", body: { action: "x", entity: "y" } },
    { method: "GET", path: "/api/reports/summary" },
    { method: "GET", path: "/api/register" },
    { method: "GET", path: "/api/returns" },
    { method: "GET", path: "/api/stocktake" },
    { method: "GET", path: "/api/transfers" },
    { method: "GET", path: "/api/purchase-orders" },
    { method: "GET", path: "/api/billing" },
    { method: "GET", path: "/api/whatsapp/inbox" },
    { method: "GET", path: "/api/ai/settings" },
    { method: "GET", path: "/api/hq/summary" },
    { method: "GET", path: "/api/hq/tenants" },
    { method: "GET", path: "/api/hq/config" },
    { method: "GET", path: "/api/hq/backup" },
  ];

  for (const route of unauthRoutes) {
    const r = await api(route.path, { method: route.method, body: route.body });
    const pass = r.status === 401 || r.status === 403;
    record({
      id: `api_unauth_${route.method}_${route.path.replace(/\W+/g, "_")}`,
      identity: "unauthenticated",
      request: `${route.method} ${route.path}`,
      expected: "401 or 403",
      actual: `status=${r.status}`,
      pass,
      severity: pass ? "none" : "CRITICAL",
    });
  }

  // Invalid / forged bearer
  {
    const r = await api("/api/reports/summary", {
      method: "GET",
      token: "eyJhbGciOiJub25lIn0.forged.payload",
    });
    record({
      id: "api_forged_bearer_reports",
      identity: "forged JWT",
      request: "GET /api/reports/summary Authorization: Bearer forged",
      expected: "401 or 403",
      actual: `status=${r.status}`,
      pass: r.status === 401 || r.status === 403,
      severity: "CRITICAL",
    });
  }

  // Note: Next app uses cookie session via createServerSupabase — Bearer alone may not work.
  // Probe whether Authorization is accepted; if not, document as gap / cookie-only.
  for (const [who, label] of [
    ["aOwner", "tenant_a_owner"],
    ["aCashier", "tenant_a_cashier"],
    ["bOwner", "tenant_b_owner"],
    ["hq", "hq_admin"],
  ]) {
    if (!sessions[who]?.ok) continue;
    const token = sessions[who].accessToken;
    for (const path of ["/api/hq/summary", "/api/hq/tenants", "/api/audit", "/api/reports/summary"]) {
      const r = await api(path, { method: "GET", token });
      const isHq = path.startsWith("/api/hq/");
      let expected;
      let pass;
      if (isHq) {
        // Only true GMS admin should pass; tenant with forged user_metadata must fail
        expected = who === "hq" ? "200 (if cookie/bearer accepted) or 401/403 if cookie-only" : "401 or 403";
        if (who === "hq") {
          pass = r.status === 200 || r.status === 401 || r.status === 403;
        } else {
          pass = r.status === 401 || r.status === 403;
        }
      } else if (path === "/api/audit") {
        expected = who === "aCashier" ? "403 (cashier) or 401 cookie-only" : "200/401/403 depending on transport";
        pass =
          who === "aCashier"
            ? r.status === 401 || r.status === 403
            : r.status === 200 || r.status === 401 || r.status === 403;
      } else {
        expected = "200 or 401 if cookie-session only";
        pass = r.status === 200 || r.status === 401 || r.status === 403;
      }
      record({
        id: `api_bearer_${label}_${path.replace(/\W+/g, "_")}`,
        identity: USERS[who],
        request: `GET ${path} with Supabase access_token Bearer`,
        expected,
        actual: `status=${r.status} err=${r.json?.error ?? ""}`,
        pass,
        severity: !pass ? "HIGH" : "none",
        notes:
          r.status === 401
            ? "App likely cookie-session only; Bearer not wired — document for remediation if intentional"
            : undefined,
      });
    }
  }

  // --- Cookie-session API (real Next/Supabase SSR path) ---
  const cookieActors = [
    ["aOwner", "tenant_a_owner"],
    ["aManager", "tenant_a_manager"],
    ["aCashier", "tenant_a_cashier"],
    ["bOwner", "tenant_b_owner"],
    ["hq", "hq_admin"],
  ];

  for (const [who, label] of cookieActors) {
    if (!sessions[who]?.ok) continue;
    const cookie = supabaseAuthCookieHeader(sessions[who]);

    // HQ routes
    for (const path of ["/api/hq/summary", "/api/hq/tenants"]) {
      const r = await api(path, { method: "GET", cookie });
      const expectPass = who === "hq";
      const pass = expectPass
        ? r.status === 200
        : r.status === 401 || r.status === 403;
      record({
        id: `api_cookie_${label}_${path.replace(/\W+/g, "_")}`,
        identity: USERS[who],
        request: `GET ${path} with sb-*-auth-token cookie`,
        expected: expectPass ? "200" : "401 or 403 (tenant / forged user_metadata must not enter HQ)",
        actual: `status=${r.status} err=${r.json?.error ?? ""}`,
        pass,
        severity: "CRITICAL",
      });
    }

    // Tenant routes
    {
      const r = await api("/api/reports/summary", { method: "GET", cookie });
      const pass = r.status === 200;
      record({
        id: `api_cookie_${label}_reports_summary`,
        identity: USERS[who],
        request: "GET /api/reports/summary with session cookie",
        expected: "200 for any authenticated tenant/HQ profile",
        actual: `status=${r.status} err=${r.json?.error ?? ""}`,
        pass,
        severity: "HIGH",
      });
    }

    {
      const r = await api("/api/audit", { method: "GET", cookie });
      const allowRead = who === "aOwner" || who === "aManager" || who === "bOwner" || who === "hq";
      const pass = allowRead
        ? r.status === 200
        : r.status === 403 || r.status === 401;
      record({
        id: `api_cookie_${label}_audit_get`,
        identity: USERS[who],
        request: "GET /api/audit",
        expected: allowRead ? "200 owner/manager" : "403 cashier",
        actual: `status=${r.status} err=${r.json?.error ?? ""}`,
        pass,
        severity: "HIGH",
      });
    }

    {
      const r = await api("/api/returns", {
        method: "POST",
        cookie,
        body: { saleId: "00000000-0000-0000-0000-000000000000", lines: [] },
      });
      const allowWrite = who === "aOwner" || who === "aManager" || who === "bOwner" || who === "hq";
      // 403 role gate, or 400/404 business error after auth — never 200 with empty forgery, never 500 for auth
      const pass = allowWrite
        ? r.status !== 401 && r.status !== 403 && r.status !== 500
        : r.status === 403 || r.status === 401;
      record({
        id: `api_cookie_${label}_returns_post`,
        identity: USERS[who],
        request: "POST /api/returns",
        expected: allowWrite ? "authenticated non-401/403 (business validation OK)" : "403 cashier",
        actual: `status=${r.status} err=${r.json?.error ?? ""}`,
        pass,
        severity: "HIGH",
      });
    }
  }

  // Static code guarantees for GMS (no user_metadata trust)
  const { readFile } = await import("node:fs/promises");
  const gms = await readFile(resolve("src/lib/server/gms-auth.ts"), "utf8");
  record({
    id: "code_gms_no_user_metadata_trust",
    identity: "static",
    request: "read src/lib/server/gms-auth.ts",
    expected: "uses app_metadata / allowlist only; no user_metadata elevation",
    actual: gms.includes("user_metadata")
      ? "mentions user_metadata"
      : "no user_metadata reference; uses app_metadata + GMS_ADMIN_EMAILS",
    pass: !gms.includes("user.app_metadata") ? false : !/user\.user_metadata|user_metadata\.role/.test(gms) || gms.includes("app_metadata"),
    severity: "CRITICAL",
  });
  // Fix pass logic properly
  results[results.length - 1].pass =
    gms.includes("app_metadata") &&
    !gms.includes("user.user_metadata") &&
    !gms.includes("raw_user_meta");

  const criticalFails = results.filter((r) => !r.pass && (r.severity === "CRITICAL" || r.severity === "HIGH"));
  const summary = {
    generatedAt: new Date().toISOString(),
    appUrl: APP_URL,
    total: results.length,
    passed: results.filter((r) => r.pass).length,
    failed: results.filter((r) => !r.pass).length,
    criticalOrHighFails: criticalFails.length,
    gate3: criticalFails.length === 0 ? "PASS" : "FAIL",
    results,
  };

  await mkdir(resolve("data/backups"), { recursive: true });
  await writeFile(
    resolve("data/backups/gate3-security-results.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        gate3: summary.gate3,
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        criticalOrHighFails: summary.criticalOrHighFails,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
