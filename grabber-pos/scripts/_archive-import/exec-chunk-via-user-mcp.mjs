#!/usr/bin/env node
/**
 * Execute chunk SQL via user-supabase MCP execute_sql (stdio).
 * Requires authenticated user-supabase MCP (Cursor mcp_auth).
 * Usage: node scripts/exec-chunk-via-user-mcp.mjs 17
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const n = process.argv[2];
if (!n) {
  console.error("Usage: node scripts/exec-chunk-via-user-mcp.mjs <chunk-number>");
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const query = readFileSync(
  join(__dirname, "..", "data", "anaz-jsonb-batches", `${n}-chunk.sql`),
  "utf8",
);

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@supabase/mcp-server-supabase@latest"],
  env: process.env,
});

const client = new Client({ name: "anaz-chunk-import", version: "1.0.0" });
await client.connect(transport);

try {
  const res = await client.callTool({
    name: "execute_sql",
    arguments: { query },
  });
  if (res.isError) {
    console.error("FAIL", JSON.stringify(res.content).slice(0, 500));
    process.exit(2);
  }
  console.log("OK", `${n}-chunk.sql`, query.length, "bytes");
  console.log(JSON.stringify(res.content));
} finally {
  await client.close();
}
