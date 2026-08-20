/**
 * Apply all supabase/migrations/*.sql in order via direct Postgres.
 * Usage: node --env-file=.env.local scripts/apply-all-migrations.mjs
 * Env: SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_REF (default veavfkjgtkbnggukzjds)
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import postgres from "postgres";

const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const migrationsDir = resolve("supabase/migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  { host: "aws-1-ap-northeast-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}` },
  { host: "aws-1-ap-southeast-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}` },
];

async function connect() {
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
      connect_timeout: 15,
    });
    try {
      await sql`select 1`;
      console.log(`Connected via ${h.host}`);
      return sql;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      await sql.end({ timeout: 2 }).catch(() => undefined);
    }
  }
  throw new Error(`Could not connect: ${lastErr}`);
}

const sql = await connect();

for (const file of files) {
  const path = join(migrationsDir, file);
  const text = await readFile(path, "utf8");
  try {
    await sql.unsafe(text);
    console.log(`OK ${file}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`FAILED ${file}: ${msg.slice(0, 500)}`);
    await sql.end({ timeout: 5 });
    process.exit(1);
  }
}

await sql.end({ timeout: 5 });
console.log(`Done — applied ${files.length} migrations`);
