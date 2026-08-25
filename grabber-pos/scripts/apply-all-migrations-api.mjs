/**
 * Apply all supabase/migrations/*.sql via Supabase Management API SQL endpoint.
 * Usage: node --env-file=.env.local scripts/apply-all-migrations-mcp-api.mjs
 * Needs: SUPABASE_ACCESS_TOKEN (personal access token) + SUPABASE_PROJECT_REF
 *
 * Fallback path used by agent: apply via MCP execute_sql / apply_migration.
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN");
  process.exit(1);
}

const migrationsDir = resolve("supabase/migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

for (const file of files) {
  const query = await readFile(join(migrationsDir, file), "utf8");
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`FAILED ${file}: ${res.status} ${text.slice(0, 500)}`);
    process.exit(1);
  }
  console.log(`OK ${file}`);
}

console.log(`Done — applied ${files.length} migrations via Management API`);
