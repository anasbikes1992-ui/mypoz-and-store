/**
 * Gate 2A: write each migration SQL to stdout as JSON lines for sequential MCP apply.
 * Usage: node scripts/list-migration-payloads.mjs
 * Does not touch the database.
 */
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";

const migrationsDir = resolve("supabase/migrations");
const files = (await readdir(migrationsDir))
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const outDir = resolve("data/gate2a");
await mkdir(outDir, { recursive: true });

const manifest = [];
for (const file of files) {
  const name = file.replace(/\.sql$/, "");
  const query = await readFile(join(migrationsDir, file), "utf8");
  const path = join(outDir, `${name}.sql`);
  await writeFile(path, query);
  manifest.push({ file, name, bytes: Buffer.byteLength(query, "utf8"), path });
}

await writeFile(
  join(outDir, "manifest.json"),
  JSON.stringify({ createdAt: new Date().toISOString(), count: manifest.length, migrations: manifest }, null, 2),
);
console.log(JSON.stringify({ ok: true, count: manifest.length, names: manifest.map((m) => m.name) }, null, 2));
