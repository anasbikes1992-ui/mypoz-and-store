/**
 * Subscribe the GRABBER app to a WhatsApp Business Account (required for live inbound webhooks).
 *
 * Find WABA id: Meta Business Suite → WhatsApp accounts → (account) → Account ID,
 * or from webhook JSON entry[0].id on a real delivery.
 *
 *   WHATSAPP_TOKEN=... WHATSAPP_APP_SECRET=... WHATSAPP_WABA_ID=123456789 \\
 *     node scripts/whatsapp-subscribe-waba.mjs
 */
import { createHmac } from "node:crypto";

const token = process.env.WHATSAPP_TOKEN?.trim();
const secret = process.env.WHATSAPP_APP_SECRET?.trim();
const wabaId = process.argv[2]?.trim() || process.env.WHATSAPP_WABA_ID?.trim();
const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";

if (!token || !wabaId) {
  console.error("Usage: WHATSAPP_TOKEN=... WHATSAPP_WABA_ID=... node scripts/whatsapp-subscribe-waba.mjs [waba-id]");
  process.exit(1);
}

function graphUrl(path) {
  const base = `https://graph.facebook.com/${version}${path}`;
  if (!secret) return `${base}?access_token=${encodeURIComponent(token)}`;
  const proof = createHmac("sha256", secret).update(token).digest("hex");
  return `${base}?access_token=${encodeURIComponent(token)}&appsecret_proof=${proof}`;
}

const subsRes = await fetch(graphUrl(`/${wabaId}/subscribed_apps`));
const subs = await subsRes.json();
console.log("Current subscribed apps:", JSON.stringify(subs, null, 2));

const postRes = await fetch(graphUrl(`/${wabaId}/subscribed_apps`), {
  method: "POST",
});
const post = await postRes.json();
console.log("Subscribe result:", JSON.stringify(post, null, 2));
process.exit(postRes.ok ? 0 : 1);
