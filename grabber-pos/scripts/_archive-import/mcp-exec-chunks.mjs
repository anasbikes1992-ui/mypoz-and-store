#!/usr/bin/env node
/**
 * Read anaz-jsonb-batches chunk SQL files and emit JSON lines for MCP execute_sql.
 * Usage: node scripts/mcp-exec-chunks.mjs [10 11 ...]
 * Each line: {"chunk":"10-chunk.sql","project_id":"...","query":"..."}
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "data", "anaz-jsonb-batches");
const PROJECT_ID = "veavfkjgtkbnggukzjds";

function chunkFiles(requested) {
  const all = readdirSync(BATCH_DIR)
    .filter((f) => /^\d+-chunk\.sql$/.test(f))
    .sort((a, b) => Number(a) - Number(b));
  if (!requested.length) return all;
  const set = new Set(requested.map((n) => `${n}-chunk.sql`));
  return all.filter((f) => set.has(f));
}

const requested = process.argv.slice(2);
for (const file of chunkFiles(requested)) {
  const query = readFileSync(join(BATCH_DIR, file), "utf8");
  process.stdout.write(
    JSON.stringify({ chunk: file, project_id: PROJECT_ID, query }) + "\n",
  );
}
