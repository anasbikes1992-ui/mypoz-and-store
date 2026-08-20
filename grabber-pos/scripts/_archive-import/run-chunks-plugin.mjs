#!/usr/bin/env node
/**
 * Execute anaz-jsonb chunk SQL files sequentially via stdin JSON lines.
 * Each line: {"project_id":"...","query":"..."}
 * Used by agent to pipe mcp-exec-chunk-from-file output to MCP manually.
 * This script validates files exist and prints execution order.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "data", "anaz-jsonb-batches");
const chunks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["10", "11", "12", "13", "14", "15", "16", "17"];

for (const n of chunks) {
  const path = join(BATCH_DIR, `${n}-chunk.sql`);
  const query = readFileSync(path, "utf8");
  process.stdout.write(
    JSON.stringify({
      chunk: `${n}-chunk.sql`,
      project_id: "veavfkjgtkbnggukzjds",
      query,
      bytes: query.length,
    }) + "\n",
  );
}
