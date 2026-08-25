/**
 * Gate 2A sequential applicator via user-supplied SQL runner callback file protocol.
 * Prefer: node scripts/gate2a-apply-sequential.mjs --dry-run
 *
 * For live apply when SUPABASE_ACCESS_TOKEN is present:
 *   node --env-file=.env.local scripts/gate2a-apply-sequential.mjs --live
 *
 * Applies each migration file verbatim in order. Stops on first failure.
 * Never invents SQL. Never patches mid-flight.
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const live = process.argv.includes("--live");
const dry = process.argv.includes("--dry-run") || !live;
const ref = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const token = process.env.SUPABASE_ACCESS_TOKEN;

const migrationsDir = resolve("supabase/migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

console.log(JSON.stringify({ mode: dry ? "dry-run" : "live", count: files.length, files }, null, 2));

if (dry) process.exit(0);

if (!token) {
  console.error("Missing SUPABASE_ACCESS_TOKEN for --live");
  process.exit(1);
}

for (const file of files) {
  const name = file.replace(/\.sql$/, "");
  const query = await readFile(join(migrationsDir, file), "utf8");
  // Management API: apply as a database query (DDL). Prefer dashboard migration endpoint when available.
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
    console.error(JSON.stringify({ failed_at: name, status: res.status, error: text.slice(0, 800) }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: name, bytes: Buffer.byteLength(query) }));
  // Hard serialize: wait 1.2s between applies to avoid version timestamp collisions if using apply_migration elsewhere
  await new Promise((r) => setTimeout(r, 1200));
}

console.log(JSON.stringify({ status: "PASS", applied: files.length }));
