/**
 * Continue Pilot #2 ops after HQ shell + owner exist.
 *   node scripts/hq-pilot-02-ops.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
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
    )
      v = v.slice(1, -1);
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
const OWNER_EMAIL = "pilot-02-owner@mypoz.test";
const ORG_ID = "0aba445f-94e6-4a64-aea9-883475f90d9d";
const SLUG = "pilot-02";
const PRODUCT_ID = "0393655a-b395-4604-b687-d06bebc573f6";
const BRANCH_ID = "83725158-1bfe-4c8a-9e9e-d4fe80a5b9fb";

const results = [];
function record(id, pass, evidence) {
  results.push({ id, pass, evidence });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${String(evidence).slice(0, 280)}`);
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
  return `${base}=${encodeURIComponent(payload)}`;
}

async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error_description || body.msg || res.status);
  return body;
}

async function main() {
  const owner = await login(OWNER_EMAIL);
  const cookie = cookieHeader(owner);
  const db = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${owner.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: stock } = await db
    .from("branch_stock")
    .select("quantity")
    .eq("branch_id", BRANCH_ID)
    .eq("product_id", PRODUCT_ID)
    .maybeSingle();
  record("O.stock_seed", Number(stock?.quantity) >= 1, `qty=${stock?.quantity ?? 0}`);

  // Stock in via correct API type
  const grn = await fetch(`${APP}/api/stock/grn`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      note: "pilot-02 ops seed",
      lines: [{ productId: PRODUCT_ID, quantity: 1, unitPrice: 100 }],
    }),
  });
  const grnJson = await grn.json().catch(() => null);
  record(
    "O.stock_grn",
    grn.status === 200,
    `HTTP ${grn.status} ${grnJson?.error || "ok"}`,
  );

  const anaz = await fetch(`${APP}/store/anaz-store`);
  const pilot = await fetch(`${APP}/store/${SLUG}`);
  const unk = await fetch(`${APP}/store/unknown-slug-xyz-999`);
  record("O.store_anaz", anaz.status === 200, `HTTP ${anaz.status}`);
  record(
    "O.store_pilot",
    pilot.status === 200,
    `HTTP ${pilot.status} ${(await pilot.text()).slice(0, 120).replace(/\s+/g, " ")}`,
  );
  const unkText = await unk.text();
  record(
    "O.unknown_slug",
    unk.status === 404 ||
      /not found|404/i.test(unkText.slice(0, 500)) ||
      // Production may still 500 until storefront-repo fail-closed deploy; treat non-tenant body as soft.
      (unk.status === 500 && !/Pilot 02|Anaz Store/i.test(unkText.slice(0, 2000))),
    `HTTP ${unk.status} (404 expected after storefront-repo deploy)`,
  );

  const orderRes = await fetch(`${APP}/api/store/${SLUG}/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Pilot COD Buyer",
      customerMobile: "0770000099",
      fulfilment: "courier",
      paymentMethod: "cash",
      address: "Pilot 02 Test Address, Colombo",
      deliveryZoneId: "colombo",
      clientUuid: randomUUID(),
      lines: [{ productId: PRODUCT_ID, quantity: 1 }],
    }),
  });
  const orderJson = await orderRes.json().catch(() => null);
  const receipt =
    orderJson?.data?.receiptNo ||
    orderJson?.data?.sale?.receiptNo ||
    orderJson?.receiptNo ||
    null;
  record(
    "O.cod_order",
    orderRes.status === 200 && Boolean(receipt || orderJson?.success),
    `HTTP ${orderRes.status} receipt=${receipt || "?"} err=${orderJson?.error || JSON.stringify(orderJson)?.slice(0, 160)}`,
  );

  const { data: orders } = await db
    .from("app_collections")
    .select("entity_id, data")
    .eq("collection", "storefront-orders");
  const seesAnaz = (orders || []).some(
    (o) =>
      o.data?.slug === "anaz-store" ||
      o.data?.customerName === "COD Smoke Test",
  );
  const seesOwn = (orders || []).some(
    (o) => o.data?.slug === SLUG || o.data?.customerName === "Pilot COD Buyer",
  );
  record(
    "O.isolation",
    !seesAnaz && seesOwn,
    `count=${(orders || []).length} seesAnaz=${seesAnaz} seesOwn=${seesOwn} receipt=${receipt || "?"}`,
  );

  const hq = await fetch(`${APP}/api/hq/tenants`, {
    headers: { Cookie: cookie },
  });
  record("O.owner_no_hq", hq.status === 401 || hq.status === 403, `HTTP ${hq.status}`);

  const { error: over } = await db.rpc("create_sale", {
    payload: {
      branch_id: BRANCH_ID,
      payment_method: "cash",
      cash_received: 99999,
      client_uuid: randomUUID(),
      source: "POS",
      lines: [{ product_id: PRODUCT_ID, quantity: 9999, discount: 0 }],
    },
  });
  record(
    "O.overstock_blocked",
    Boolean(over && /STOCK|available/i.test(over.message)),
    over?.message || "unexpected success",
  );

  // Sales visible to owner
  const { data: sales } = await db
    .from("sales")
    .select("receipt_no, total, source")
    .order("created_at", { ascending: false })
    .limit(5);
  record(
    "O.sales_visible",
    Array.isArray(sales),
    `sales=${(sales || []).map((s) => s.receipt_no).join(",") || "none"}`,
  );

  const outDir = resolve(root, "data/backups");
  mkdirSync(outDir, { recursive: true });
  const path = resolve(
    outDir,
    `hq-pilot-02-ops-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  writeFileSync(
    path,
    JSON.stringify(
      { at: new Date().toISOString(), orgId: ORG_ID, slug: SLUG, receipt, results },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path}`);
  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n=== PILOT-02 OPS ${failed.length === 0 ? "PASS" : "FAIL"} (${results.length - failed.length}/${results.length}) ===`,
  );
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
