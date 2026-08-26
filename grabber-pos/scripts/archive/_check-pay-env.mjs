import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
for (const k of [
  "WEBXPAY_PUBLIC_KEY",
  "WEBXPAY_SECRET_KEY",
  "WEBXPAY_GATEWAY_URL",
  "PAYMENTS_LKR_PROVIDER",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
]) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  const v = m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  if (!v) console.log(k + ": MISSING");
  else if (k.includes("URL") || k.includes("PROVIDER")) console.log(k + ": SET " + v);
  else console.log(k + ": SET len=" + v.length);
}
