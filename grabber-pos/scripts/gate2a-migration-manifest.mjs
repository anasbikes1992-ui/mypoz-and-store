/**
 * Gate 2A: one-shot migration replay helper.
 * Reads supabase/migrations/*.sql in order and prints a JSON manifest
 * so an agent/orchestrator can apply each file verbatim via MCP apply_migration
 * with ZERO manual SQL patches.
 *
 * Usage: node scripts/gate2a-migration-manifest.mjs
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const migrationsDir = resolve("supabase/migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const expected = [
  "0001_schema.sql",
  "0002_functions.sql",
  "0003_rls.sql",
  "0004_catalog_rpc.sql",
  "0005_app_data.sql",
  "0006_app_documents.sql",
  "0007_storefront.sql",
  "0008_commerce_cloud.sql",
  "0009_commerce_core.sql",
  "0010_product_commerce.sql",
  "0010b_product_commerce_columns.sql",
  "0011_product_variants.sql",
  "0012_smart_collections.sql",
  "0013_variant_sales_and_fulfillment.sql",
  "0014_whatsapp_orders.sql",
  "0015_platform_settings.sql",
  "0016_media_and_storefront_discount.sql",
  "0017_storefront_public_documents.sql",
  "0018_ux_events.sql",
  "0019_rls_select_wrappers.sql",
  "0020_collection_matches_stable.sql",
  "0021_receipt_indexes_domain_stock.sql",
  "0022_wholesale_tiers.sql",
  "0023_launch_rls_hardening.sql",
  "0024_p0_auth_and_ops_hardening.sql",
  "0025_returns_refunds.sql",
  "0026_register_shift_summaries.sql",
];

if (JSON.stringify(files) !== JSON.stringify(expected)) {
  console.error("Migration file set mismatch");
  console.error("found:", files);
  console.error("expected:", expected);
  process.exit(1);
}

const migrations = [];
for (const file of files) {
  const sql = await readFile(join(migrationsDir, file), "utf8");
  migrations.push({
    file,
    name: file.replace(/\.sql$/, ""),
    bytes: Buffer.byteLength(sql, "utf8"),
    sql,
  });
}

const outDir = resolve("data/backups");
await mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const manifestPath = resolve(outDir, `gate2a-migration-manifest-${stamp}.json`);
await writeFile(
  manifestPath,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      project: "veavfkjgtkbnggukzjds",
      rule: "Apply each sql field verbatim via apply_migration. STOP on first failure. No manual SQL.",
      count: migrations.length,
      migrations: migrations.map(({ file, name, bytes }) => ({ file, name, bytes })),
    },
    null,
    2,
  ),
);

// Also write individual SQL copies for MCP-sized applies
const sqlDir = resolve(outDir, `gate2a-sql-${stamp}`);
await mkdir(sqlDir, { recursive: true });
for (const m of migrations) {
  await writeFile(join(sqlDir, m.file), m.sql);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      manifestPath,
      sqlDir,
      count: migrations.length,
      files: migrations.map((m) => ({ file: m.file, name: m.name, bytes: m.bytes })),
    },
    null,
    2,
  ),
);
