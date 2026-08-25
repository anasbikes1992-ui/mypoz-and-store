/**
 * WebXPay RSA E2E helper — creates pending sale + checkout HTML for staging demo card.
 * Demo cards (WebXPay tokenize guide):
 *   5111 1111 1111 1118 Master Without 3DS (preferred)
 *   4012 0000 3333 0026 Visa Without 3DS
 *   any future expiry + any 3-digit CVV
 *
 *   node scripts/webxpay-rsa-e2e-checkout.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const EMAIL = process.env.SMOKE_EMAIL || "tenant-a-cashier@mypoz.test";

function escAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

async function login(email) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login: ${body.error_description || body.msg || res.status}`);
  return body;
}

function cookieHeader(session) {
  const base = "sb-veavfkjgtkbnggukzjds-auth-token";
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

async function api(path, { method = "GET", cookie, body } = {}) {
  const res = await fetch(`${APP}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  if (!ANON) {
    console.error("Need NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }
  const session = await login(EMAIL);
  const cookie = cookieHeader(session);

  const status = await api("/api/payments/status", { cookie });
  console.log("webxpay", JSON.stringify(status.json?.data?.webxpay));

  const saleRes = await api("/api/sales", {
    method: "POST",
    cookie,
    body: {
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
      clientUuid: randomUUID(),
      customerName: "RSA E2E Demo",
      employee: "e2e",
      source: "POS",
    },
  });
  if (!saleRes.json?.success) {
    console.error(saleRes.json);
    process.exit(1);
  }
  const sale = saleRes.json.data;
  console.log("SALE", sale.id, sale.receiptNo, sale.status, sale.total);

  const payRes = await api("/api/pos/pay", {
    method: "POST",
    cookie,
    body: {
      reference: sale.receiptNo || sale.id,
      amountMinor: Math.round(Number(sale.total) * 100) || 2500,
      currency: "LKR",
      description: `RSA E2E ${sale.receiptNo || sale.id}`,
      customer: {
        name: "RSA E2E Demo",
        email: "rsa-e2e@mypoz.test",
        phone: "0770000000",
      },
    },
  });
  if (!payRes.json?.success || !payRes.json?.data) {
    console.error(payRes.json);
    process.exit(1);
  }
  const { formAction, formFields, provider } = payRes.json.data;
  console.log("provider", provider, "action", formAction);

  const inputs = Object.entries(formFields || {})
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escAttr(k)}" value="${escAttr(v)}" />`,
    )
    .join("\n");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>WebXPay RSA E2E</title></head>
<body>
<p>Auto-submitting to WebXPay staging…</p>
<p>Demo card (Master Without 3DS): 5111 1111 1111 1118 · any future expiry · any CVV</p>
<form id="f" method="POST" action="${escAttr(formAction)}">${inputs}</form>
<script>document.getElementById("f").submit()</script>
</body></html>`;

  const dir = resolve("data/backups");
  await mkdir(dir, { recursive: true });
  const htmlPath = resolve(dir, "webxpay-rsa-checkout.html");
  const metaPath = resolve(dir, "webxpay-rsa-meta.json");
  await writeFile(htmlPath, html);
  await writeFile(
    metaPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        total: sale.total,
        formAction,
        demoCard: {
          number: "5111111111111118",
          note: "Master Without 3DS — WebXPay tokenize guide",
          expiry: "12/30",
          cvv: "123",
        },
      },
      null,
      2,
    ),
  );
  console.log("HTML", htmlPath);
  console.log("META", metaPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
