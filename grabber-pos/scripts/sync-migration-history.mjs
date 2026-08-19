/**
 * Register repo migrations in supabase_migrations.schema_migrations when DDL
 * was already applied manually (apply-sql.mjs) but dashboard shows "No migrations".
 *
 * Usage: SUPABASE_PROJECT_REF=vtawrxmkahpgwgydibox node --env-file=.env.local scripts/sync-migration-history.mjs
 */
import postgres from "postgres";

const ref = process.env.SUPABASE_PROJECT_REF || "vtawrxmkahpgwgydibox";
const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("Missing SUPABASE_DB_PASSWORD");
  process.exit(1);
}

const MIGRATIONS = [
  "0001_schema",
  "0002_functions",
  "0003_rls",
  "0004_catalog_rpc",
  "0005_app_data",
  "0006_app_documents",
  "0007_storefront",
  "0008_commerce_cloud",
  "0009_commerce_core",
  "0010_product_commerce",
  "0010b_product_commerce_columns",
  "0011_product_variants",
  "0012_smart_collections",
  "0013_variant_sales_and_fulfillment",
  "0014_whatsapp_orders",
  "0015_platform_settings",
  "0016_media_and_storefront_discount",
  "0017_storefront_public_documents",
  "0018_ux_events",
];

const sql = postgres({
  host: `db.${ref}.supabase.co`,
  port: 5432,
  database: "postgres",
  username: "postgres",
  password,
  ssl: "require",
  max: 1,
  connect_timeout: 20,
});

try {
  await sql`CREATE SCHEMA IF NOT EXISTS supabase_migrations`;
  await sql`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    )
  `;

  const existing = await sql`
    SELECT version FROM supabase_migrations.schema_migrations
  `;

  const have = new Set(existing.map((r) => r.version));
  let inserted = 0;

  for (const name of MIGRATIONS) {
    if (have.has(name)) continue;
    await sql`
      INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
      VALUES (${name}, ARRAY[]::text[], ${name})
    `;
    inserted += 1;
  }

  const all = await sql`
    SELECT version, name
    FROM supabase_migrations.schema_migrations
    ORDER BY version
  `;

  console.log(JSON.stringify({ project: ref, inserted, total: all.length, migrations: all }, null, 2));
} finally {
  await sql.end({ timeout: 3 });
}
