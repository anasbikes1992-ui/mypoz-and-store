/**
 * Gate 5 logical export — commerce-critical tables via Postgres.
 * Prefer this over the broken Aug-24 dump. Secrets in rows are redacted.
 *
 *   node --env-file=.env.local scripts/gate5-logical-export.mjs
 *
 * Requires SUPABASE_DB_PASSWORD (Dashboard → Database → Database password).
 * Also copies a counts-only sidecar usable without full row dump.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const password = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
if (!password) {
  console.error(
    "Missing SUPABASE_DB_PASSWORD. Add DB password, then re-run. Counts-only baseline already in data/backups/gate5-baseline-*.json",
  );
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
  "branch_members",
  "categories",
  "products",
  "product_variants",
  "product_barcodes",
  "branch_stock",
  "variant_branch_stock",
  "suppliers",
  "purchases",
  "purchase_lines",
  "sales",
  "sale_lines",
  "payments",
  "payment_intents",
  "payment_events",
  "sale_returns",
  "sale_return_lines",
  "refunds",
  "refund_lines",
  "stock_movements",
  "stock_transfers",
  "stock_transfer_lines",
  "stocktakes",
  "stocktake_lines",
  "registers",
  "shifts",
  "shift_summaries",
  "receipt_counters",
  "audit_events",
  "platform_settings",
  "storefronts",
  "store_collections",
  "store_collection_products",
];

function redactObject(obj) {
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (!obj || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (
      /token|secret|password|apikey|api[_-]?key|accessToken|openai|verifyToken|private_key|webhook/i.test(
        k,
      ) &&
      typeof v === "string" &&
      v
    ) {
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
    connect_timeout: 12,
  });
  try {
    const tables = {};
    const counts = {};
    for (const name of TABLES) {
      try {
        const rows = await sql.unsafe(`select * from public.${name}`);
        tables[name] = rows.map(redactObject);
        counts[name] = rows.length;
      } catch (e) {
        tables[name] = { error: e instanceof Error ? e.message : String(e) };
        counts[name] = null;
      }
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = resolve("data/backups");
    await mkdir(dir, { recursive: true });
    const file = resolve(dir, `gate5-logical-${stamp}.json`);
    const meta = resolve(dir, `gate5-logical-${stamp}.meta.json`);
    await writeFile(
      file,
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          host: h.host,
          projectRef: ref,
          kind: "gate5-logical-export",
          tables,
        },
        null,
        2,
      ),
    );
    await writeFile(
      meta,
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          host: h.host,
          counts,
          note: "Store off-site. DB backup ≠ Storage objects.",
        },
        null,
        2,
      ),
    );
    await sql.end({ timeout: 2 });
    console.log(`OK wrote ${file}`);
    console.log(`OK wrote ${meta}`);
    process.exit(0);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

console.error("Logical export failed:", lastErr);
process.exit(1);
