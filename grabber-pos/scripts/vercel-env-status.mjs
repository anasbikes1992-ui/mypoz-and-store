/**
 * Pull Vercel production env and print SET/MISSING only (no secret values).
 * Optionally write phone id to data/.phone-id-only.txt for HQ attach.
 *
 *   node scripts/vercel-env-status.mjs
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pullPath = join(root, ".env.vercel.pull");

process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--use-system-ca"]
  .filter(Boolean)
  .join(" ");

const pull = spawnSync(
  "npx",
  [
    "--yes",
    "vercel",
    "env",
    "pull",
    ".env.vercel.pull",
    "--environment=production",
    "--yes",
  ],
  { cwd: root, encoding: "utf8", shell: true },
);
if (pull.status !== 0) {
  console.error(pull.stderr || pull.stdout);
  process.exit(pull.status || 1);
}

const env = readFileSync(pullPath, "utf8");
function get(key) {
  const m = env.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!m) return null;
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v || null;
}

const keys = [
  "WHATSAPP_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
];
for (const k of keys) {
  const v = get(k);
  console.log(`${k}: ${v ? "SET" : "MISSING"}`);
}

const phone = get("WHATSAPP_PHONE_NUMBER_ID");
if (phone) {
  writeFileSync(join(root, "data", ".phone-id-only.txt"), phone, "utf8");
  console.log("wrote data/.phone-id-only.txt");
}

// Prefer not leaving full pull on disk after reporting — keep only if --keep
if (!process.argv.includes("--keep") && existsSync(pullPath)) {
  unlinkSync(pullPath);
  console.log("removed .env.vercel.pull");
}
