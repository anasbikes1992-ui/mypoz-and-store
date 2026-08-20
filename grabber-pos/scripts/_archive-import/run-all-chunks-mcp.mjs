#!/usr/bin/env node
/**
 * Execute anaz-jsonb chunk SQL files via Supabase MCP execute_sql (stdio proxy).
 * Reads SQL from disk and calls tools/call on a local MCP session if CURSOR_MCP env is set,
 * otherwise prints chunk list for manual MCP execution.
 *
 * Primary path: node scripts/run-all-chunks-mcp.mjs
 * Uses child_process to invoke cursor's bundled MCP via npx @supabase/mcp-server-supabase when available.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "data", "anaz-jsonb-batches");
const PROJECT_ID = "veavfkjgtkbnggukzjds";
const ORG_ID = "304adc33-7279-4547-a73d-a2240333e814";

function chunkFiles(requested) {
  const all = readdirSync(BATCH_DIR)
    .filter((f) => /^\d+-chunk\.sql$/.test(f))
    .sort((a, b) => Number(a) - Number(b));
  if (!requested.length) return all;
  const set = new Set(requested.map((n) => `${n}-chunk.sql`));
  return all.filter((f) => set.has(f));
}

async function main() {
  const requested = process.argv.slice(2);
  const files = chunkFiles(requested.length ? requested : ["10", "11", "12", "13", "14", "15", "16", "17"]);
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error("SUPABASE_ACCESS_TOKEN required for MCP stdio server");
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@supabase/mcp-server-supabase@latest", "--access-token", accessToken],
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
  });

  const client = new Client({ name: "anaz-import", version: "1.0.0" });
  await client.connect(transport);

  const results = [];
  for (const file of files) {
    const query = readFileSync(join(BATCH_DIR, file), "utf8");
    process.stdout.write(`executing ${file} (${query.length} bytes)... `);
    try {
      const res = await client.callTool({
        name: "execute_sql",
        arguments: { project_id: PROJECT_ID, query },
      });
      const err = res.isError ? JSON.stringify(res.content) : null;
      if (err) throw new Error(err);
      console.log("OK");
      results.push({ file, ok: true });
    } catch (e) {
      console.log("FAIL");
      console.error(`  ${e.message?.slice?.(0, 400) ?? e}`);
      results.push({ file, ok: false, error: String(e.message ?? e) });
    }
  }

  try {
    const res = await client.callTool({
      name: "execute_sql",
      arguments: {
        project_id: PROJECT_ID,
        query: `select count(*)::int as products from products where org_id = '${ORG_ID}' and is_active`,
      },
    });
    console.log("\ncount:", JSON.stringify(res.content));
  } catch (e) {
    console.error("count failed:", e.message);
  }

  await client.close();
  if (results.some((r) => !r.ok)) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
