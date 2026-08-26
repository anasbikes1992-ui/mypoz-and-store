/**
 * Copy WEBXPAY_* from a vercel pull file into Preview (and optionally Production).
 * Does not print secret values.
 *
 *   node scripts/_set-webxpay-preview-from-pull.mjs .env.webxpay.check
 *
 * Requires: npx vercel logged in; NODE_OPTIONS=--use-system-ca on Windows if TLS fails.
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

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

const pub = get("WEBXPAY_PUBLIC_KEY");
const sec = get("WEBXPAY_SECRET_KEY");
if (!pub || !sec) {
  console.error("Missing WEBXPAY keys in", file);
  process.exit(1);
}

function addEnv(name, value, environment) {
  const tmp = resolve(`.tmp-${name}-${environment}.txt`);
  writeFileSync(tmp, value, "utf8");
  // Remove existing silently if present
  spawnSync(
    "npx",
    ["vercel", "env", "rm", name, environment, "--yes"],
    { stdio: "ignore", shell: true, env: process.env },
  );
  const r = spawnSync(
    "npx",
    ["vercel", "env", "add", name, environment, "--sensitive"],
    {
      input: value + "\n",
      encoding: "utf8",
      shell: true,
      env: process.env,
    },
  );
  try {
    unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 || /Saved|Added|created/i.test(out);
  console.log(`${name} → ${environment}: ${ok ? "OK" : "CHECK"} (exit ${r.status})`);
  if (!ok) console.log(out.slice(0, 400));
}

process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || "") + " --use-system-ca";
console.log("public_len", pub.length, "secret_len", sec.length);
addEnv("WEBXPAY_PUBLIC_KEY", pub, "preview");
addEnv("WEBXPAY_SECRET_KEY", sec, "preview");
console.log("Done. Redeploy Preview to pick up keys.");
