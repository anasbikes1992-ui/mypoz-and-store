/**
 * Read-only migration sanity check against production Supabase.
 * Usage: node --env-file=.env.local scripts/check-migrations.mjs
 */
import postgres from "postgres";

const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const hosts = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  { host: "aws-0-ap-southeast-1.pooler.supabase.com", port: 6543, user: `postgres.${ref}` },
];

let sql;
let lastErr = "";
for (const h of hosts) {
  sql = postgres({
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
    await sql`SELECT 1 AS ok`;
    break;
  } catch (e) {
    lastErr = e instanceof Error ? e.message : String(e);
    await sql.end({ timeout: 2 }).catch(() => undefined);
    sql = null;
  }
}

if (!sql) {
  console.error(`Could not connect: ${lastErr.slice(0, 240)}`);
  process.exit(1);
}

try {
  const [{ n: tableCount }] = await sql`
    SELECT count(*)::int AS n
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;

  const fns = await sql`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'storefront_ingest_ux_event',
        'storefront_by_host',
        'storefront_create_order',
        'storefront_documents'
      )
    ORDER BY routine_name
  `;

  const salesCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'sales'
      AND column_name IN ('source', 'fulfillment_status', 'payment_status', 'channel')
    ORDER BY column_name
  `;

  const buckets = await sql`
    SELECT id FROM storage.buckets WHERE id = 'media'
  `;

  const migrations = await sql`
    SELECT version, name
    FROM supabase_migrations.schema_migrations
    ORDER BY version
  `.catch(() => []);

  console.log(
    JSON.stringify(
      {
        project: ref,
        tableCount,
        appliedMigrations: migrations,
        storefrontFunctions: fns.map((r) => r.routine_name),
        salesChannelColumns: salesCols.map((r) => r.column_name),
        mediaBucket: buckets.length > 0,
        needs0017: !fns.some((r) => r.routine_name === "storefront_documents"),
        needs0018: !fns.some((r) => r.routine_name === "storefront_ingest_ux_event"),
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 3 });
}
