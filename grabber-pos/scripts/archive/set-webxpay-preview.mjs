/**
 * Add WEBXPAY_* from a vercel pull file to Preview (all branches).
 *   node scripts/set-webxpay-preview.mjs .env.webxpay.check
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const file = process.argv[2] || ".env.webxpay.check";
const t = readFileSync(file, "utf8");

function get(k) {
  const m = t.match(new RegExp(`^${k}=(.*)$`, "m"));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
  return v.replace(/\\n/g, "\n");
}

function normalizePem(key) {
  let trimmed = key.trim();
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [body];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

const pub = normalizePem(get("WEBXPAY_PUBLIC_KEY") || "");
const sec = (get("WEBXPAY_SECRET_KEY") || "").trim();
if (!pub || !sec) {
  console.error("Missing keys in", file);
  process.exit(1);
}

process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --use-system-ca`.trim();

function add(name, value) {
  // Prefer single-line body for PUBLIC KEY so Windows CLI --value does not break on newlines.
  const payload = name.includes("PUBLIC")
    ? value.replace(/-----BEGIN PUBLIC KEY-----/g, "").replace(/-----END PUBLIC KEY-----/g, "").replace(/\s+/g, "")
    : value;
  spawnSync("npx", ["vercel", "env", "rm", name, "preview", "--yes"], {
    stdio: "ignore",
    shell: true,
    env: process.env,
  });
  const r = spawnSync(
    "npx",
    [
      "vercel",
      "env",
      "add",
      name,
      "preview",
      "--value",
      payload,
      "--yes",
      "--sensitive",
    ],
    { encoding: "utf8", shell: false, env: process.env, cwd: process.cwd() },
  );
  const out = `${r.stdout || ""}${r.stderr || ""}`;
  console.log(
    `${name}: exit=${r.status} ${/Saved|Added|Created|updated|Environment Variable/i.test(out) ? "OK" : out.slice(0, 400)}`,
  );
}

console.log("pub_len", pub.length, "sec_len", sec.length);
add("WEBXPAY_PUBLIC_KEY", pub);
add("WEBXPAY_SECRET_KEY", sec);
