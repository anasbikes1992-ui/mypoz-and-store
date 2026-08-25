/**
 * Gate 4 — Commerce & Integrity Certification (API + user-JWT DB reads).
 * Privileged claim/complete steps write SQL to data/backups/gate4-privileged.sql
 * for operator/MCP execution when service_role is unavailable.
 *
 *   node --env-file=.env.local scripts/gate4-commerce-cert.mjs
 *   (set NEXT_PUBLIC_SUPABASE_ANON_KEY + APP_URL in env)
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";

const PRODUCT_A = "a3333333-3333-3333-3333-333333333333";
const BRANCH_A = "a1111111-1111-1111-1111-111111111111";
const ORG_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const USERS = {
  aOwner: "anazazeez1992@gmail.com",
  aCashier: "tenant-a-cashier@mypoz.test",
  bOwner: "pilot2-owner@mypoz.test",
};

const results = [];

function record(id, pass, evidence, severity = "P0") {
  results.push({ id, pass, evidence, severity });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${String(evidence).slice(0, 240)}`);
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

function userDb(accessToken) {
  return createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok)
    throw new Error(`login ${email}: ${body.error_description || body.msg || res.status}`);
  return body;
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const res = await fetch(`${APP}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text: text.slice(0, 400) };
}

async function stockQty(db, productId = PRODUCT_A) {
  const { data, error } = await db
    .from("branch_stock")
    .select("quantity")
    .eq("branch_id", BRANCH_A)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Number(data?.quantity ?? 0);
}

async function setStock(db, qty, productId = PRODUCT_A) {
  const current = await stockQty(db, productId);
  const delta = qty - current;
  if (delta === 0) return;
  const { error } = await db.rpc("adjust_stock", {
    p_branch: BRANCH_A,
    p_product: productId,
    p_delta: delta,
    p_note: "gate4 seed",
    p_reason: "adjustment",
    p_reference_id: null,
  });
  if (error) throw new Error(`setStock: ${error.message}`);
}

function detUuid(seed) {
  const hex = createHash("sha256").update(String(seed)).digest("hex");
  const base = hex.slice(0, 32).split("");
  base[12] = "4";
  base[16] = ((parseInt(base[16], 16) & 0x3) | 0x8).toString(16);
  const c = base.join("");
  return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20, 32)}`;
}

async function main() {
  if (!ANON) {
    console.error("Need NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const sessions = {};
  for (const [k, email] of Object.entries(USERS)) {
    try {
      sessions[k] = await login(email);
      record(`auth_${k}`, true, `user=${sessions[k].user?.id}`);
    } catch (e) {
      record(`auth_${k}`, false, String(e), "P0");
    }
  }
  if (!sessions.aCashier || !sessions.aOwner) process.exit(1);

  const cashier = cookieHeader(sessions.aCashier);
  const ownerDb = userDb(sessions.aOwner.access_token);
  const cashierDb = userDb(sessions.aCashier.access_token);
  const ownerB = sessions.bOwner ? cookieHeader(sessions.bOwner) : null;

  // Prefer owner for stock adjust (role)
  const db = ownerDb;

  await setStock(db, 50);
  const beforeCash = await stockQty(db);
  const cashSale = await api("/api/sales", {
    method: "POST",
    cookie: cashier,
    body: {
      lines: [{ productId: PRODUCT_A, name: "SEC-A-1", quantity: 1, discount: 0, unitPrice: 25 }],
      paymentMethod: "cash",
      cashReceived: 25,
      clientUuid: randomUUID(),
      employee: "gate4-cash",
      source: "POS",
    },
  });
  const afterCash = await stockQty(db);
  record(
    "4A_cash_pos_e2e",
    Boolean(cashSale.json?.success) && afterCash === beforeCash - 1,
    `http=${cashSale.status} id=${cashSale.json?.data?.receiptNo || cashSale.json?.data?.id} stock ${beforeCash}→${afterCash} err=${cashSale.json?.error || ""}`,
  );

  const beforePending = await stockQty(db);
  const pendingSale = await api("/api/sales", {
    method: "POST",
    cookie: cashier,
    body: {
      lines: [{ productId: PRODUCT_A, name: "SEC-A-1", quantity: 1, discount: 0, unitPrice: 25 }],
      paymentMethod: "card",
      status: "pending",
      paymentStatus: "pending",
      clientUuid: randomUUID(),
      employee: "gate4-card",
      source: "POS",
    },
  });
  const afterPending = await stockQty(db);
  const ref = pendingSale.json?.data?.receiptNo || pendingSale.json?.data?.id;
  const { data: intent } = await db
    .from("payment_intents")
    .select("id,reference,status,amount_minor,metadata,branch_id,client_uuid,org_id")
    .eq("reference", ref)
    .maybeSingle();
  record(
    "4A_card_pending_no_stock",
    pendingSale.json?.data?.status === "pending" &&
      afterPending === beforePending &&
      intent?.status === "pending",
    `ref=${ref} intent=${intent?.status} stock ${beforePending}→${afterPending}`,
  );

  const pay = await api("/api/pos/pay", {
    method: "POST",
    cookie: cashier,
    body: {
      reference: ref,
      amountMinor: 2500,
      currency: "LKR",
      customer: { name: "Gate4", email: "", phone: "0770000000" },
    },
  });
  record(
    "4A_card_checkout_form",
    Boolean(pay.json?.success) &&
      String(pay.json?.data?.formAction || "").includes("stagingxpay.info"),
    `status=${pay.status} action=${pay.json?.data?.formAction}`,
  );

  const badWh = await fetch(`${APP}/api/payments/webhook/WEBXPAY`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "payment=notbase64&signature=nope",
  });
  record("4A_invalid_webhook", badWh.status === 400 || badWh.status === 202, `status=${badWh.status}`);

  const emptyWh = await fetch(`${APP}/api/payments/webhook/WEBXPAY`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "",
  });
  record("4A_empty_webhook", emptyWh.status >= 400 && emptyWh.status < 500, `status=${emptyWh.status}`);

  // Privileged completion — emit SQL for MCP/service role
  const beforeComplete = await stockQty(db);
  const eventId = `gate4-wh-${ref}`;
  const meta = intent?.metadata || {};
  const pendingMeta = meta.pendingSale || meta.pending_sale || {};
  const lines = Array.isArray(pendingMeta.lines) ? pendingMeta.lines : [];
  const clientUuid = intent?.client_uuid || detUuid(ref);
  const privileged = {
    ref,
    intentId: intent?.id,
    orgId: ORG_A,
    branchId: intent?.branch_id || BRANCH_A,
    eventId,
    beforeComplete,
    clientUuid,
    lines,
  };
  await mkdir(resolve("data/backups"), { recursive: true });
  await writeFile(
    resolve("data/backups/gate4-privileged-context.json"),
    JSON.stringify(privileged, null, 2),
  );

  // Concurrent last stock (API-level)
  await setStock(db, 1);
  const stock1 = await stockQty(db);
  const concurrent = await Promise.all(
    [1, 2].map((i) =>
      api("/api/sales", {
        method: "POST",
        cookie: cashier,
        body: {
          lines: [{ productId: PRODUCT_A, name: "SEC-A-1", quantity: 1, discount: 0, unitPrice: 25 }],
          paymentMethod: "cash",
          cashReceived: 25,
          clientUuid: randomUUID(),
          employee: `gate4-race-${i}`,
          source: "POS",
        },
      }),
    ),
  );
  const successes = concurrent.filter((r) => r.json?.success).length;
  const fails = concurrent.filter((r) => !r.json?.success).length;
  const finalStock = await stockQty(db);
  record(
    "4A_concurrent_last_stock",
    stock1 === 1 && successes === 1 && fails === 1 && finalStock === 0,
    `start=${stock1} success=${successes} fail=${fails} final=${finalStock} detail=${concurrent
      .map((r) => r.json?.error || r.status)
      .join("|")}`,
  );

  if (ownerB) {
    const cross = await api("/api/sales", {
      method: "POST",
      cookie: ownerB,
      body: {
        lines: [{ productId: PRODUCT_A, name: "cross", quantity: 1, discount: 0, unitPrice: 25 }],
        paymentMethod: "cash",
        cashReceived: 25,
        clientUuid: randomUUID(),
        source: "POS",
      },
    });
    record(
      "4A_tenant_isolation_sale",
      !cross.json?.success,
      `status=${cross.status} err=${cross.json?.error || cross.text}`,
    );
  }

  // Receipt via RPC as authenticated
  const receiptNos = [];
  for (let i = 0; i < 8; i++) {
    const { data, error } = await db.rpc("next_receipt_no", { p_branch: BRANCH_A });
    if (error) {
      record("4A_receipt_sequencing", false, error.message);
      break;
    }
    receiptNos.push(String(data));
  }
  if (receiptNos.length === 8) {
    record(
      "4A_receipt_sequencing",
      new Set(receiptNos).size === 8,
      `receipts=${receiptNos.join(",")}`,
    );
  }

  const beforeAdj = await stockQty(db);
  const adj = await db.rpc("adjust_stock", {
    p_branch: BRANCH_A,
    p_product: PRODUCT_A,
    p_delta: 2,
    p_note: "gate4 adj",
    p_reason: "adjustment",
    p_reference_id: null,
  });
  const afterAdj = await stockQty(db);
  record(
    "4B_stock_adjustment",
    !adj.error && afterAdj === beforeAdj + 2,
    `stock ${beforeAdj}→${afterAdj} err=${adj.error?.message || ""}`,
  );

  await setStock(db, 0);
  const neg = await db.rpc("adjust_stock", {
    p_branch: BRANCH_A,
    p_product: PRODUCT_A,
    p_delta: -1,
    p_note: "gate4 neg",
    p_reason: "sale",
    p_reference_id: null,
  });
  const afterNeg = await stockQty(db);
  record(
    "4B_no_negative_stock",
    Boolean(neg.error) && afterNeg >= 0,
    `err=${neg.error?.message || "none"} qty=${afterNeg}`,
  );

  const { data: audits } = await db
    .from("audit_events")
    .select("action")
    .order("created_at", { ascending: false })
    .limit(10);
  record(
    "4A_audit_events_present",
    Array.isArray(audits) && audits.length > 0,
    `recent=${(audits || []).map((a) => a.action).join(",")}`,
  );

  // Placeholders — filled by MCP privileged step + follow-up runners
  record(
    "4A_webhook_event_idempotent_claim",
    false,
    "PENDING_MCP: see data/backups/gate4-privileged-context.json",
    "P0",
  );
  record(
    "4A_card_paid_stock_once",
    false,
    "PENDING_MCP: claim + create_sale_internal",
    "P0",
  );
  record(
    "4A_webhook_replay_no_double_stock",
    false,
    "PENDING_MCP",
    "P0",
  );
  record(
    "4A_live_webxpay_rsa_webhook",
    false,
    "Manual staging card completion still required for full RSA callback proof",
    "P1",
  );
  record("4B_void_api", false, "Not yet executed in this batch", "P1");
  record("4B_returns_refunds", false, "Not yet executed in this batch", "P1");
  record("4B_po_transfer_stocktake", false, "Not yet executed in this batch", "P1");

  await setStock(db, 100);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const p0Fails = results.filter((r) => !r.pass && r.severity === "P0").length;
  const summary = {
    gate4: "IN_PROGRESS",
    total: results.length,
    passed,
    failed,
    p0Fails,
    app: APP,
    privilegedContext: "data/backups/gate4-privileged-context.json",
    at: new Date().toISOString(),
    results,
  };
  await writeFile(
    resolve("data/backups/gate4-commerce-results.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify({ gate4: summary.gate4, passed, failed, p0Fails, total: summary.total }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
