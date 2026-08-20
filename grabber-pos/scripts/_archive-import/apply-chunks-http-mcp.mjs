#!/usr/bin/env node
/**
 * Execute anaz-jsonb chunks via Supabase HTTP MCP (project-scoped URL).
 * Usage: node scripts/apply-chunks-http-mcp.mjs [10 11 ... 17]
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "data", "anaz-jsonb-batches");
const MCP_URL =
  "https://mcp.supabase.com/mcp?project_ref=veavfkjgtkbnggukzjds&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching";

const chunks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["10", "11", "12", "13", "14", "15", "16", "17"];

const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
  requestInit: { headers: {} },
});
const client = new Client({ name: "anaz-import-http", version: "1.0.0" });
await client.connect(transport);

const results = [];
for (const n of chunks) {
  const file = `${n}-chunk.sql`;
  const query = readFileSync(join(BATCH_DIR, file), "utf8");
  process.stdout.write(`executing ${file} (${query.length} bytes)... `);
  try {
    const res = await client.callTool({
      name: "execute_sql",
      arguments: { query },
    });
    if (res.isError) throw new Error(JSON.stringify(res.content).slice(0, 500));
    console.log("OK");
    results.push({ file, ok: true });
  } catch (e) {
    console.log("FAIL");
    console.error(" ", e.message ?? e);
    results.push({ file, ok: false, error: String(e.message ?? e) });
  }
}

try {
  const res = await client.callTool({
    name: "execute_sql",
    arguments: {
      query:
        "select count(*)::int as products from products where org_id = '304adc33-7279-4547-a73d-a2240333e814' and is_active",
    },
  });
  console.log("\ncount:", JSON.stringify(res.content));
} catch (e) {
  console.error("count failed:", e.message);
}

await client.close();
if (results.some((r) => !r.ok)) process.exit(2);
