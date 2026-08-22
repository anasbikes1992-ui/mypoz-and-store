/**
 * Check Meta WABA webhook subscription + phone number linkage.
 *
 *   node scripts/whatsapp-waba-check.mjs
 */
import { createHmac } from "node:crypto";

const token = process.env.WHATSAPP_TOKEN?.trim();
const secret = process.env.WHATSAPP_APP_SECRET?.trim();
const phoneId = (process.env.WHATSAPP_PHONE_NUMBER_ID ?? "101779492851300").trim();
const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
const base = `https://graph.facebook.com/${version}`;

if (!token) {
  console.error("Set WHATSAPP_TOKEN");
  process.exit(1);
}

function graphUrl(path) {
  if (!secret) return `${base}${path}`;
  const proof = createHmac("sha256", secret).update(token).digest("hex");
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${path}${sep}appsecret_proof=${proof}`;
}

async function g(path) {
  const res = await fetch(graphUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

const phone = await g(
  `/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating,webhook_configuration,account_mode,whatsapp_business_account{id,name,account_review_status}`,
);
console.log("\n=== Phone number ===");
console.log(JSON.stringify(phone, null, 2));

const wabaIdFinal = phone.json?.whatsapp_business_account?.id;
if (wabaIdFinal) {
  const subs = await g(`/${wabaIdFinal}/subscribed_apps`);
  console.log("\n=== WABA subscribed apps ===");
  console.log(JSON.stringify(subs, null, 2));

  const override = await g(
    `/${wabaIdFinal}?fields=webhook_configuration,id,name,account_review_status`,
  );
  console.log("\n=== WABA webhook config ===");
  console.log(JSON.stringify(override, null, 2));
} else {
  console.log("\n(no whatsapp_business_account on phone — check token scopes)");
}

const appId = "622249256393200";
const appSubs = await g(`/${appId}/subscriptions`);
console.log("\n=== App subscriptions ===");
console.log(JSON.stringify(appSubs, null, 2));
