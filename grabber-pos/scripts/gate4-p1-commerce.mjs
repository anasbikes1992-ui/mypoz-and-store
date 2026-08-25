/**
 * Gate 4 P1 — void / returns / transfer / stocktake / PO
 * Usage:
 *   node scripts/gate4-p1-commerce.mjs
 * Requires NEXT_PUBLIC_SUPABASE_ANON_KEY + APP_URL in env.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const PIN = process.env.GATE4_MANAGER_PIN || "48291";

const PRODUCT_A = "a3333333-3333-3333-3333-333333333333";
const BRANCH_A = "a1111111-1111-1111-1111-111111111111";
const BRANCH_B = "a2222222-2222-2222-2222-222222222222";

const USERS = {
  aOwner: "anazazeez1992@gmail.com",
  aCashier: "tenant-a-cashier@mypoz.test",
  aManager: "tenant-a-manager@mypoz.test",
};

const results = [];
function record(id, pass, evidence, severity = "P1") {
  results.push({ id, pass, evidence, severity });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${String(evidence).slice(0, 260)}`);
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

function userDb(token) {
  return createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
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
  return { status: res.status, json, text: text.slice(0, 500) };
}

async function stockQty(db, branchId = BRANCH_A) {
  const { data, error } = await db
    .from("branch_stock")
    .select("quantity")
    .eq("branch_id", branchId)
    .eq("product_id", PRODUCT_A)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Number(data?.quantity ?? 0);
}

async function setStock(db, qty, branchId = BRANCH_A) {
  const current = await stockQty(db, branchId);
  const delta = qty - current;
  if (delta === 0) return;
  const { error } = await db.rpc("adjust_stock", {
    p_branch: branchId,
    p_product: PRODUCT_A,
    p_delta: delta,
    p_note: "gate4p1 seed",
    p_reason: "adjustment",
    p_reference_id: null,
  });
  if (error) throw new Error(error.message);
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
      record(`auth_${k}`, true, sessions[k].user?.id);
    } catch (e) {
      record(`auth_${k}`, false, String(e), "P0");
    }
  }
  if (!sessions.aOwner || !sessions.aCashier) process.exit(1);

  const ownerCk = cookieHeader(sessions.aOwner);
  const cashierCk = cookieHeader(sessions.aCashier);
  const ownerDb = userDb(sessions.aOwner.access_token);

  // Ensure manager PIN for void API
  const pinSave = await api("/api/permissions", {
    method: "POST",
    cookie: ownerCk,
    body: { managerPin: PIN },
  });
  record(
    "4B_manager_pin_configured",
    Boolean(pinSave.json?.success && pinSave.json?.data?.hasPin),
    `status=${pinSave.status} hasPin=${pinSave.json?.data?.hasPin} err=${pinSave.json?.error || ""}`,
  );

  await setStock(ownerDb, 40, BRANCH_A);
  await setStock(ownerDb, 0, BRANCH_B).catch(async () => {
    // branch B may have no stock row yet — seed via +qty from 0 using adjust
    const { error } = await ownerDb.rpc("adjust_stock", {
      p_branch: BRANCH_B,
      p_product: PRODUCT_A,
      p_delta: 0,
      p_note: "gate4p1 ensure row",
      p_reason: "opening",
      p_reference_id: null,
    });
    if (error) {
      // try insert via +1 then -1
      await ownerDb.rpc("adjust_stock", {
        p_branch: BRANCH_B,
        p_product: PRODUCT_A,
        p_delta: 1,
        p_note: "gate4p1 open",
        p_reason: "opening",
        p_reference_id: null,
      });
      await ownerDb.rpc("adjust_stock", {
        p_branch: BRANCH_B,
        p_product: PRODUCT_A,
        p_delta: -1,
        p_note: "gate4p1 zero",
        p_reason: "adjustment",
        p_reference_id: null,
      });
    }
  });

  // ── Cash sale then VOID ────────────────────────────────────────────────
  const beforeSale = await stockQty(ownerDb, BRANCH_A);
  const saleRes = await api("/api/sales", {
    method: "POST",
    cookie: cashierCk,
    body: {
      lines: [{ productId: PRODUCT_A, name: "SEC-A-1", quantity: 2, discount: 0, unitPrice: 25 }],
      paymentMethod: "cash",
      cashReceived: 50,
      clientUuid: randomUUID(),
      employee: "gate4p1-void",
      source: "POS",
    },
  });
  const sale = saleRes.json?.data;
  const afterSale = await stockQty(ownerDb, BRANCH_A);
  record(
    "4B_void_prep_sale",
    Boolean(saleRes.json?.success) && afterSale === beforeSale - 2,
    `sale=${sale?.id || sale?.receiptNo} stock ${beforeSale}→${afterSale}`,
  );

  const voidRes = await api(`/api/sales/${sale?.id || sale?.receiptNo}/void`, {
    method: "POST",
    cookie: ownerCk,
    body: { reason: "Gate4 P1 void test", managerPin: PIN },
  });
  const afterVoid = await stockQty(ownerDb, BRANCH_A);
  const { data: voidedRow } = await ownerDb
    .from("sales")
    .select("id,status,void_reason")
    .eq("id", sale?.id)
    .maybeSingle();
  record(
    "4B_void_api",
    Boolean(voidRes.json?.success) &&
      voidedRow?.status === "voided" &&
      afterVoid === beforeSale,
    `http=${voidRes.status} status=${voidedRow?.status} stock ${afterSale}→${afterVoid} (expect ${beforeSale}) err=${voidRes.json?.error || ""}`,
  );

  // ── Sale then PARTIAL RETURN ───────────────────────────────────────────
  const beforeRetSale = await stockQty(ownerDb, BRANCH_A);
  const sale2 = await api("/api/sales", {
    method: "POST",
    cookie: cashierCk,
    body: {
      lines: [{ productId: PRODUCT_A, name: "SEC-A-1", quantity: 5, discount: 0, unitPrice: 25 }],
      paymentMethod: "cash",
      cashReceived: 125,
      clientUuid: randomUUID(),
      employee: "gate4p1-return",
      source: "POS",
    },
  });
  const sale2Id = sale2.json?.data?.id;
  const { data: lines } = await ownerDb
    .from("sale_lines")
    .select("id, quantity, product_id")
    .eq("sale_id", sale2Id);
  const lineId = lines?.[0]?.id;
  const afterRetSale = await stockQty(ownerDb, BRANCH_A);

  const ret = await api("/api/returns", {
    method: "POST",
    cookie: ownerCk,
    body: {
      saleId: sale2Id,
      reason: "Gate4 partial return",
      refundMethod: "cash",
      lines: [{ saleLineId: lineId, quantity: 2, disposition: "restock" }],
    },
  });
  const afterReturn = await stockQty(ownerDb, BRANCH_A);
  const refundAmt = ret.json?.data?.refund?.amount;
  record(
    "4B_returns_refunds",
    Boolean(ret.json?.success) &&
      afterRetSale === beforeRetSale - 5 &&
      afterReturn === afterRetSale + 2 &&
      Number(refundAmt) === 50,
    `saleStock ${beforeRetSale}→${afterRetSale} return→${afterReturn} refund=${refundAmt} err=${ret.json?.error || ""}`,
  );

  // Over-return must fail
  const over = await api("/api/returns", {
    method: "POST",
    cookie: ownerCk,
    body: {
      saleId: sale2Id,
      reason: "over return",
      lines: [{ saleLineId: lineId, quantity: 10, disposition: "restock" }],
    },
  });
  record(
    "4B_return_over_qty_rejected",
    !over.json?.success,
    `status=${over.status} err=${over.json?.error || over.text}`,
  );

  // ── TRANSFER out/in ────────────────────────────────────────────────────
  await setStock(ownerDb, 20, BRANCH_A);
  const srcBefore = await stockQty(ownerDb, BRANCH_A);
  const dstBefore = await stockQty(ownerDb, BRANCH_B);
  const xfer = await api("/api/transfers", {
    method: "POST",
    cookie: ownerCk,
    body: {
      sourceBranch: BRANCH_A,
      targetBranch: BRANCH_B,
      productId: PRODUCT_A,
      productName: "SEC-A-1",
      quantity: 3,
      notes: "gate4p1 transfer",
    },
  });
  const xferId = xfer.json?.data?.id;
  const approve = xferId
    ? await api(`/api/transfers/${xferId}/approve`, {
        method: "POST",
        cookie: ownerCk,
        body: {},
      })
    : { status: 0, json: { success: false, error: "no transfer id" } };
  const srcAfter = await stockQty(ownerDb, BRANCH_A);
  const dstAfter = await stockQty(ownerDb, BRANCH_B);
  record(
    "4B_transfer_out_in",
    Boolean(xfer.json?.success && approve.json?.success) &&
      srcAfter === srcBefore - 3 &&
      dstAfter === dstBefore + 3,
    `xfer=${xferId} src ${srcBefore}→${srcAfter} dst ${dstBefore}→${dstAfter} err=${xfer.json?.error || approve.json?.error || ""}`,
  );

  // ── STOCKTAKE ──────────────────────────────────────────────────────────
  await setStock(ownerDb, 15, BRANCH_A);
  const sysBefore = await stockQty(ownerDb, BRANCH_A);
  const st = await api("/api/stocktake", {
    method: "POST",
    cookie: ownerCk,
    body: {
      note: "gate4p1 stocktake",
      lines: [{ productId: PRODUCT_A, countedQty: 12 }],
    },
  });
  const stId = st.json?.data?.id;
  const stPost = stId
    ? await api(`/api/stocktake/${stId}/post`, { method: "POST", cookie: ownerCk })
    : { json: { success: false, error: "no stocktake" } };
  const sysAfter = await stockQty(ownerDb, BRANCH_A);
  record(
    "4B_stocktake_post",
    Boolean(st.json?.success && stPost.json?.success) && sysAfter === 12,
    `systemWas=${sysBefore} counted=12 final=${sysAfter} err=${st.json?.error || stPost.json?.error || ""}`,
  );

  // ── PO create + receive ────────────────────────────────────────────────
  const beforePo = await stockQty(ownerDb, BRANCH_A);
  const po = await api("/api/purchase-orders", {
    method: "POST",
    cookie: ownerCk,
    body: {
      supplier: "Gate4 Supplier",
      reference: `G4-PO-${Date.now()}`,
      lines: [{ productId: PRODUCT_A, quantity: 4, unitPrice: 10 }],
    },
  });
  const poId = po.json?.data?.id;
  const recv = poId
    ? await api(`/api/purchase-orders/${poId}/receive`, {
        method: "POST",
        cookie: ownerCk,
      })
    : { json: { success: false, error: "no po" } };
  const afterPo = await stockQty(ownerDb, BRANCH_A);
  record(
    "4B_po_receive",
    Boolean(po.json?.success && recv.json?.success) && afterPo === beforePo + 4,
    `po=${poId} stock ${beforePo}→${afterPo} err=${po.json?.error || recv.json?.error || ""}`,
  );

  // ── Webhook RSA surface: verify adapter rejects forged signed-looking body
  const forged = await fetch(`${APP}/api/payments/webhook/WEBXPAY`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      payment: Buffer.from("POS-FAKE|ref|2026-01-01|00|ok|1").toString("base64"),
      signature: Buffer.from("not-a-real-signature").toString("base64"),
      custom_fields: Buffer.from("POS-FAKE").toString("base64"),
    }).toString(),
  });
  const forgedText = await forged.text();
  record(
    "4A_forged_webhook_rejected",
    forged.status === 400 || forged.status === 202,
    `status=${forged.status} body=${forgedText.slice(0, 120)}`,
  );

  await setStock(ownerDb, 100, BRANCH_A);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const summary = {
    gate4p1: failed === 0 ? "PASS" : "FAIL",
    passed,
    failed,
    total: results.length,
    at: new Date().toISOString(),
    results,
  };
  await mkdir(resolve("data/backups"), { recursive: true });
  await writeFile(
    resolve("data/backups/gate4-p1-results.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify({ gate4p1: summary.gate4p1, passed, failed, total: summary.total }, null, 2));
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
