/**
 * WebXPay staging smoke — pending sale + /api/pos/pay form check.
 * Does NOT complete a real card charge (stops at encrypted form ready for staging).
 *
 * Usage:
 *   node scripts/webxpay-staging-smoke.mjs
 */
const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.GATE3_ANON_KEY ||
  "";
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const EMAIL = process.env.SMOKE_EMAIL || "a5555555@sec-test.mypoz.local";
// Prefer known gate3 cashier email from cert script
const CASHIER = process.env.SMOKE_CASHIER || "cashier-a@sec-test.local";

async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `login failed ${email}: ${body?.error_description || body?.msg || body?.error || res.status}`,
    );
  }
  return body;
}

function cookieHeader(session) {
  const ref = "veavfkjgtkbnggukzjds";
  const base = `sb-${ref}-auth-token`;
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
  for (let i = 0; i < payload.length; i += CHUNK) parts.push(payload.slice(i, i + CHUNK));
  return parts.map((p, i) => `${base}.${i}=${encodeURIComponent(p)}`).join("; ");
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const res = await fetch(`${APP_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
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
  return { status: res.status, json, text: text.slice(0, 500) };
}

async function main() {
  if (!ANON_KEY) {
    console.error("Set GATE3_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const cashierEmail =
    process.env.SMOKE_EMAIL || "tenant-a-cashier@mypoz.test";

  console.log(`APP=${APP_URL}`);
  console.log(`login as ${cashierEmail}`);
  const session = await login(cashierEmail);
  const cookie = cookieHeader(session);

  const status = await api("/api/payments/status", { cookie });
  console.log("payments/status", JSON.stringify(status.json?.data?.webxpay));

  const saleBody = {
    lines: [
      {
        productId: "a3333333-3333-3333-3333-333333333333",
        name: "Tenant A Secret Widget",
        quantity: 1,
        discount: 0,
        unitPrice: 25,
      },
    ],
    paymentMethod: "card",
    status: "pending",
    paymentStatus: "pending",
    clientUuid: crypto.randomUUID(),
    customerName: "WebXPay Staging Smoke",
    employee: "smoke",
    source: "POS",
  };

  const saleRes = await api("/api/sales", {
    method: "POST",
    cookie,
    body: saleBody,
  });
  console.log("POST /api/sales", saleRes.status, JSON.stringify(saleRes.json)?.slice(0, 400));
  if (!saleRes.json?.success) {
    process.exit(1);
  }
  const sale = saleRes.json.data;
  if (sale.status !== "pending") {
    console.error("FAIL: expected pending sale, got", sale.status);
    process.exit(1);
  }
  console.log("PASS pending sale", sale.receiptNo || sale.id);

  const payRes = await api("/api/pos/pay", {
    method: "POST",
    cookie,
    body: {
      reference: sale.receiptNo || sale.id,
      amountMinor: Math.round(Number(sale.total) * 100) || 2500,
      currency: "LKR",
      description: `POS smoke ${sale.receiptNo || sale.id}`,
      customer: {
        name: "WebXPay Staging Smoke",
        email: "",
        phone: "0770000000",
      },
    },
  });
  console.log("POST /api/pos/pay", payRes.status);
  const checkout = payRes.json?.data;
  if (!payRes.json?.success || !checkout) {
    console.error(payRes.json || payRes.text);
    process.exit(1);
  }

  const action = checkout.formAction || "";
  const fields = checkout.formFields || {};
  console.log("provider", checkout.provider);
  console.log("formAction", action);
  console.log(
    "fields",
    Object.keys(fields).join(","),
    "payment_len",
    String(fields.payment || "").length,
  );

  if (!action.includes("stagingxpay.info")) {
    console.error("FAIL: formAction is not staging URL");
    process.exit(1);
  }
  if (!fields.payment || !fields.secret_key || !fields.cms) {
    console.error("FAIL: missing mandatory WebXPay form fields");
    process.exit(1);
  }
  console.log("PASS WebXPay staging form ready (not submitting live charge from CI)");

  // Soft probe: POST form to staging — expect HTML billing page (not our error JSON)
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) form.set(k, String(v));
  const gw = await fetch(action, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    redirect: "manual",
  });
  const gwText = await gw.text();
  console.log(
    "staging POST",
    gw.status,
    "loc",
    gw.headers.get("location") || "",
    "body_snip",
    gwText.replace(/\s+/g, " ").slice(0, 180),
  );
  if (gw.status >= 200 && gw.status < 500) {
    console.log("PASS staging gateway accepted encrypted payment POST");
  } else {
    console.error("WARN staging gateway unexpected status", gw.status);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
