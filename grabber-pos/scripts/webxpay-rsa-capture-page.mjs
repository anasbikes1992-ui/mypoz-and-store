/**
 * One-shot: create pending sale, POST to staging from Node (trusted encoding),
 * write absolute capturePay HTML for browser card entry.
 *
 *   node scripts/webxpay-rsa-capture-page.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const EMAIL = process.env.SMOKE_EMAIL || "tenant-a-cashier@mypoz.test";

async function main() {
  if (!ANON) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY required");
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());
  if (!login.access_token) throw new Error(JSON.stringify(login));

  const cookie =
    "sb-veavfkjgtkbnggukzjds-auth-token=" +
    encodeURIComponent(
      JSON.stringify({
        access_token: login.access_token,
        refresh_token: login.refresh_token,
        expires_in: login.expires_in ?? 3600,
        expires_at: login.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: login.user,
      }),
    );

  const saleRes = await fetch(`${APP}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
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
    headers: { "Content-Type": "application/json", Cookie: cookie },
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

  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(formFields)) form.set(k, String(v));
  const gw = await fetch(formAction, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    body: form.toString(),
  });
  let html = await gw.text();
  if (html.includes("Invalid encryption") || html.includes("error=442")) {
    throw new Error("staging rejected encryption on node POST");
  }
  if (!html.includes("capturePay") && !html.includes("enc_post_array_data")) {
    throw new Error("unexpected staging HTML (no capturePay)");
  }

  // Make assets/form absolute so page works when served from localhost
  html = html
    .replaceAll('href="../../../../../', 'href="https://stagingxpay.info/')
    .replaceAll('src="../../../../../', 'src="https://stagingxpay.info/')
    .replaceAll(
      'action="https://stagingxpay.info/index.php?route=checkout/billing/capturePay"',
      'action="https://stagingxpay.info/index.php?route=checkout/billing/capturePay"',
    );

  const dir = resolve("data/backups");
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "webxpay-rsa-capture.html"), html);
  await writeFile(
    resolve(dir, "webxpay-rsa-meta.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        total: sale.total,
        stage: "capturePay-html-ready",
        demoCard: {
          number: "5111111111111118",
          label: "Master Without 3DS",
          expiry: "12/30",
          cvv: "123",
          altVisaNo3ds: "4012000033330026",
        },
        docs: "https://developers.webxpay.com/Guides/Tokenize-Integration/tokenize.html",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        receiptNo: sale.receiptNo,
        saleId: sale.id,
        htmlBytes: html.length,
        file: "data/backups/webxpay-rsa-capture.html",
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
