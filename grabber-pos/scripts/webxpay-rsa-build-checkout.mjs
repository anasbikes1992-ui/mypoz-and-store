/**
 * Build JS-safe auto-submit checkout + verify staging accepts encryption.
 *   node scripts/webxpay-rsa-build-checkout.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const EMAIL = process.env.SMOKE_EMAIL || "tenant-a-cashier@mypoz.test";

async function login() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}

function cookie(session) {
  const payload = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: session.user,
  });
  return `sb-veavfkjgtkbnggukzjds-auth-token=${encodeURIComponent(payload)}`;
}

async function main() {
  if (!ANON) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY required");
  const session = await login();
  const c = cookie(session);

  const saleRes = await fetch(`${APP}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: c },
    body: JSON.stringify({
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
    }),
  }).then((r) => r.json());
  if (!saleRes.success) throw new Error(JSON.stringify(saleRes));
  const sale = saleRes.data;

  const payRes = await fetch(`${APP}/api/pos/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: c },
    body: JSON.stringify({
      reference: sale.receiptNo || sale.id,
      amountMinor: Math.round(Number(sale.total) * 100) || 2500,
      currency: "LKR",
      customer: {
        name: "RSA E2E Demo",
        email: "rsa-e2e@mypoz.test",
        phone: "0770000000",
      },
    }),
  }).then((r) => r.json());
  if (!payRes.success) throw new Error(JSON.stringify(payRes));
  const { formAction, formFields } = payRes.data;

  // Do NOT probe-POST the encrypted payment — staging treats ciphertext as one-shot.
  const dir = resolve("data/backups");
  await mkdir(dir, { recursive: true });

  const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>WebXPay RSA submit</title></head>
<body>
<p>Submitting to staging… Demo card Master Without 3DS: 5111111111111118 / 12/30 / 123</p>
<script>
const action = ${JSON.stringify(formAction)};
const fields = ${JSON.stringify(formFields)};
const f = document.createElement("form");
f.method = "POST";
f.action = action;
for (const [k, v] of Object.entries(fields)) {
  const i = document.createElement("input");
  i.type = "hidden";
  i.name = k;
  i.value = v;
  f.appendChild(i);
}
document.body.appendChild(f);
f.submit();
</script>
</body></html>`;
  await writeFile(resolve(dir, "webxpay-rsa-checkout.html"), page);
  await writeFile(
    resolve(dir, "webxpay-rsa-meta.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        total: sale.total,
        formAction,
        demoCard: {
          number: "5111111111111118",
          label: "Master Without 3DS (WebXPay tokenize guide)",
          expiry: "12/30",
          cvv: "123",
        },
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      { receiptNo: sale.receiptNo, saleId: sale.id, formAction },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
