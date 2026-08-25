/**
 * DESTRUCTIVE: drop and recreate public schema on MyPoz Supabase.
 * Auth schema (users) is preserved. App data is destroyed.
 * Usage: node --env-file=.env.local scripts/reset-public-schema.mjs --confirm
 */
import postgres from "postgres";

if (!process.argv.includes("--confirm")) {
  console.error("Refusing to run without --confirm (this wipes all public schema data)");
  process.exit(1);
}

const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

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
      connect_timeout: 20,
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

try {
  console.log("Dropping public schema…");
  await sql.unsafe("DROP SCHEMA IF EXISTS public CASCADE");
  console.log("Creating public schema…");
  await sql.unsafe(`
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO postgres;
    GRANT ALL ON SCHEMA public TO public;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
  `);

  await sql`CREATE SCHEMA IF NOT EXISTS supabase_migrations`;
  await sql`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    )
  `;
  await sql`DELETE FROM supabase_migrations.schema_migrations`;
  console.log("Cleared supabase_migrations.schema_migrations");
  console.log("OK public schema reset complete");
} finally {
  await sql.end({ timeout: 5 });
}
