/**
 * Diagnose staging billing vs capturePay.
 *   node scripts/webxpay-staging-diagnose.mjs
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const SUPABASE_URL = "https://veavfkjgtkbnggukzjds.supabase.co";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app";
const PASSWORD = process.env.GATE3_TEST_PASSWORD || "Gate3-SecTest-2026!";

const jar = new Map();
function remember(res) {
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
    body: JSON.stringify({
      email: "tenant-a-cashier@mypoz.test",
      password: PASSWORD,
    }),
  }).then((r) => r.json());
  const cookie =
    "sb-veavfkjgtkbnggukzjds-auth-token=" +
    encodeURIComponent(
      JSON.stringify({
        access_token: login.access_token,
        refresh_token: login.refresh_token,
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: login.user,
      }),
    );

  const sale = await fetch(`${APP}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      lines: [
        {
          productId: "a3333333-3333-3333-3333-333333333333",
          name: "W",
          quantity: 1,
          discount: 0,
          unitPrice: 25,
        },
      ],
      paymentMethod: "card",
      status: "pending",
      paymentStatus: "pending",
      clientUuid: randomUUID(),
      customerName: "RSA",
      employee: "e2e",
      source: "POS",
    }),
  }).then((r) => r.json());

  const pay = await fetch(`${APP}/api/pos/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      reference: sale.data.receiptNo,
      amountMinor: 2500,
      currency: "LKR",
      customer: {
        name: "RSA Demo",
        email: "rsa@mypoz.test",
        phone: "0770000000",
      },
    }),
  }).then((r) => r.json());

  const billing = await fetch(pay.data.formAction, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 MyPozDiagnose/1.0",
    },
    body: new URLSearchParams(pay.data.formFields).toString(),
  });
  remember(billing);
  const billingHtml = await billing.text();
  writeFileSync("data/backups/webxpay-billing-latest.html", billingHtml);

  const billingOk =
    !/Invalid encryption|error=442/i.test(billingHtml) &&
    /enc_post_array_data|capturePay/i.test(billingHtml);

  const m =
    billingHtml.match(/name="enc_post_array_data"[^>]*value="([^"]+)"/) ||
    billingHtml.match(/id="enc_post_array_data"[^>]*value="([^"]+)"/);
  const enc = (m?.[1] || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"');

  let capture = {
    status: null,
    loc: "",
    bad442: null,
    title: "",
    skipped: true,
  };
  if (enc) {
    const res = await fetch(
      "https://stagingxpay.info/index.php?route=checkout/billing/capturePay",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 MyPozDiagnose/1.0",
          Cookie: cookieHeader(),
          Referer: pay.data.formAction,
          Origin: "https://stagingxpay.info",
        },
        body: new URLSearchParams({ enc_post_array_data: enc }).toString(),
        redirect: "manual",
      },
    );
    remember(res);
    const loc = res.headers.get("location") || "";
    let html = await res.text();
    if (res.status >= 300 && res.status < 400 && loc) {
      const r2 = await fetch(new URL(loc, "https://stagingxpay.info/"), {
        headers: {
          Cookie: cookieHeader(),
          "User-Agent": "Mozilla/5.0 MyPozDiagnose/1.0",
        },
        redirect: "manual",
      });
      html = await r2.text();
    }
    writeFileSync("data/backups/webxpay-capture-latest.html", html);
    capture = {
      status: res.status,
      loc: loc.slice(0, 180),
      bad442: /442|Invalid encryption/i.test(html) || /442/.test(loc),
      title: (html.match(/<title>([^<]+)/i) || [])[1] || "",
      skipped: false,
    };
  }

  console.log(
    JSON.stringify(
      {
        receipt: sale.data.receiptNo,
        formAction: pay.data.formAction,
        billing: {
          status: billing.status,
          ok: billingOk,
          title: (billingHtml.match(/<title>([^<]+)/i) || [])[1] || "",
          cookies: jar.size,
          encLen: enc.length,
        },
        capture,
        verdict: billingOk
          ? capture.bad442 === false
            ? "PASS_FULL_STAGING_UI"
            : "PASS_BILLING_ONLY_CAPTURE_442"
          : "FAIL_BILLING_442",
      },
      null,
      2,
    ),
  );
  process.exit(billingOk ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
