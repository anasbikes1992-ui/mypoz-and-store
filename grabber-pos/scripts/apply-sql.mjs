/**
 * Apply a SQL file to the MyPoz Supabase project using SUPABASE_DB_PASSWORD.
 * Usage: node --env-file=.env.local scripts/apply-sql.mjs supabase/migrations/0014_whatsapp_orders.sql
 * Never logs the password.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-sql.mjs <path-to.sql>");
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const sqlText = await readFile(resolve(file), "utf8");
const hosts = [
  {
    host: `db.${ref}.supabase.co`,
    port: 5432,
    user: "postgres",
  },
  {
    host: "aws-1-ap-northeast-1.pooler.supabase.com",
    port: 6543,
    user: `postgres.${ref}`,
  },
  {
    host: "aws-1-ap-southeast-1.pooler.supabase.com",
    port: 6543,
    user: `postgres.${ref}`,
  },
];

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
    await sql.unsafe(sqlText);
    await sql.end({ timeout: 5 });
    console.log(`OK applied ${file} via ${h.host}`);
    process.exit(0);
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    await sql.end({ timeout: 2 }).catch(() => undefined);
    const connectFail = /ENOTFOUND|ECONNREFUSED|timeout|ETIMEDOUT|self-signed/i.test(
      lastErr,
    );
    if (!connectFail) {
      console.error(`FAILED ${file}: ${lastErr.slice(0, 400)}`);
      process.exit(1);
    }
  }
}

console.error(`FAILED ${file}: ${lastErr.slice(0, 240)}`);
process.exit(1);
