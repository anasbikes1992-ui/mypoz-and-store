/**
 * Fingerprint WebXPay keys from a vercel pull file (no secret dump).
 *   node scripts/_fingerprint-webxpay-env.mjs .env.webxpay.check
 */
import { readFileSync } from "node:fs";
import { publicEncrypt, constants } from "node:crypto";

const file = process.argv[2] || ".env.webxpay.check";
const t = readFileSync(file, "utf8");
function get(k) {
  const m = t.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v.replace(/\\n/g, "\n");
}
function normalizePem(key) {
  let trimmed = key.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}
const pub = get("WEBXPAY_PUBLIC_KEY") || "";
const sec = get("WEBXPAY_SECRET_KEY") || "";
console.log("file", file);
console.log("public_len", pub.length, "has_begin", /BEGIN/.test(pub), "tail", pub.replace(/\s+/g, "").slice(-24));
console.log("secret_len", sec.length, "tail", sec.slice(-8));
try {
  const pem = normalizePem(pub);
  publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from("ORDER|1.00"),
  );
  console.log("encrypt_selftest", "OK");
} catch (e) {
  console.log("encrypt_selftest", "FAIL", e instanceof Error ? e.message : e);
}
