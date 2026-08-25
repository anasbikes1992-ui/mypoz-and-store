/**
 * Node cookie-jar chain: billing → capturePay → save HTML for browser card entry.
 *   node scripts/webxpay-rsa-node-chain.mjs
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";
const EMAIL = process.env.SMOKE_EMAIL || "tenant-a-cashier@mypoz.test";

const jar = new Map();

function rememberCookies(res) {
  const raw =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  for (const c of raw) {
    const nv = c.split(";")[0];
    const i = nv.indexOf("=");
    if (i > 0) jar.set(nv.slice(0, i), nv.slice(i + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

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

  const billing = await fetch(formAction, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 MyPozRSA/1.0",
    },
    body: new URLSearchParams(formFields).toString(),
    redirect: "manual",
  });
  rememberCookies(billing);
  // follow redirects manually if any
  let billingHtml = await billing.text();
  if (billing.status >= 300 && billing.status < 400) {
    const loc = billing.headers.get("location");
    const r2 = await fetch(new URL(loc, formAction), {
      headers: { Cookie: cookieHeader(), "User-Agent": "Mozilla/5.0 MyPozRSA/1.0" },
    });
    rememberCookies(r2);
    billingHtml = await r2.text();
  }

  const encMatch =
    billingHtml.match(/name="enc_post_array_data"[^>]*value="([^"]+)"/) ||
    billingHtml.match(/id="enc_post_array_data"[^>]*value="([^"]+)"/);
  if (!encMatch) {
    throw new Error(
      `no enc_post_array_data; bad=${billingHtml.includes("442")} title=${(billingHtml.match(/<title>([^<]+)/) || [])[1]}`,
    );
  }

  const capture = await fetch(
    "https://stagingxpay.info/index.php?route=checkout/billing/capturePay",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 MyPozRSA/1.0",
        Cookie: cookieHeader(),
        Referer: formAction,
      },
      body: new URLSearchParams({ enc_post_array_data: encMatch[1] }).toString(),
      redirect: "manual",
    },
  );
  rememberCookies(capture);
  let captureHtml = await capture.text();
  let loc = capture.headers.get("location");
  if (capture.status >= 300 && capture.status < 400 && loc) {
    const r2 = await fetch(new URL(loc, "https://stagingxpay.info/"), {
      headers: { Cookie: cookieHeader(), "User-Agent": "Mozilla/5.0 MyPozRSA/1.0" },
      redirect: "manual",
    });
    rememberCookies(r2);
    loc = r2.headers.get("location") || loc;
    captureHtml = await r2.text();
  }

  const dir = resolve("data/backups");
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, "webxpay-rsa-after-capture.html"), captureHtml);
  const summary = {
    receiptNo: sale.receiptNo,
    saleId: sale.id,
    billingCookies: jar.size,
    captureStatus: capture.status,
    loc,
    bad442: captureHtml.includes("442") || /Invalid encryption/i.test(captureHtml),
    title: (captureHtml.match(/<title>([^<]+)/i) || [])[1] || "",
    hasCardFields: /name=["']?(card|number|cvv|expiry)/i.test(captureHtml),
    textSnip: captureHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 280),
  };
  await writeFile(resolve(dir, "webxpay-rsa-meta.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.bad442) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
