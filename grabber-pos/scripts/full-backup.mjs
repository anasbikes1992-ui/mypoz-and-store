/**
 * Operator full JSON dump via Postgres (not a Vercel route).
 * Usage: node --env-file=.env.local scripts/full-backup.mjs
 * Writes data/backups/mypoz-full-YYYY-MM-DD.json (gitignored under data/).
 * Never logs the password.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const password = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  {
    host: "aws-1-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    user: `postgres.${ref}`,
  },
];

const TABLES = [
  "organizations",
  "branches",
  "profiles",
  "categories",
  "products",
  "product_variants",
  "branch_stock",
  "variant_branch_stock",
  "sales",
  "sale_lines",
  "stock_documents",
  "app_collections",
  "app_documents",
  "platform_settings",
];

function redact(row) {
  if (!row || typeof row !== "object") return row;
  const copy = { ...row };
  if (copy.data && typeof copy.data === "object") {
    copy.data = redactObject(copy.data);
  }
  return copy;
}

function redactObject(obj) {
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (/token|secret|password|apikey|api[_-]?key|accessToken|openai|verifyToken/i.test(k) && typeof v === "string" && v) {
      out[k] = "[redacted]";
    } else if (v && typeof v === "object") {
      out[k] = redactObject(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

let lastErr = "";
for (const h of hosts) {
  const sql = postgres({
    host: h.host,
    port: h.port,
    database: "postgres",
    username: h.user,
    password,
    ssl: "require",
    max: 1,
    connect_timeout: 8,
  });
  try {
    const tables = {};
    for (const name of TABLES) {
      try {
        const rows = await sql.unsafe(`select * from public.${name}`);
        tables[name] = rows.map(redact);
      } catch (e) {
        tables[name] = { error: e instanceof Error ? e.message : String(e) };
      }
    }
    const stamp = new Date().toISOString().slice(0, 10);
    const dir = resolve("data/backups");
    await mkdir(dir, { recursive: true });
    const file = resolve(dir, `mypoz-full-${stamp}.json`);
    await writeFile(
      file,
      JSON.stringify(
        { exportedAt: new Date().toISOString(), host: h.host, tables },
        null,
        2,
      ),
    );
    await sql.end({ timeout: 2 });
    console.log(`OK wrote ${file}`);
    process.exit(0);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

console.error("Backup failed:", lastErr);
process.exit(1);
