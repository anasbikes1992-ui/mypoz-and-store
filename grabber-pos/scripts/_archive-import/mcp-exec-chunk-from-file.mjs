#!/usr/bin/env node
/**
 * Helper: read chunk SQL and print MCP execute_sql args as JSON to stdout.
 * Parent agent should CallMcpTool plugin-supabase-supabase execute_sql with output.
 * Usage: node scripts/mcp-exec-chunk-from-file.mjs 17
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const n = process.argv[2];
if (!n) {
  console.error("Usage: node scripts/mcp-exec-chunk-from-file.mjs <chunk-number>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, "..", "data", "anaz-jsonb-batches", `${n}-chunk.sql`);
const query = readFileSync(path, "utf8");
process.stdout.write(
  JSON.stringify({ project_id: "veavfkjgtkbnggukzjds", query, _chunk: `${n}-chunk.sql` }),
);
