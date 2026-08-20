#!/usr/bin/env node
/**
 * Execute anaz-jsonb-batches/*-chunk.sql via Supabase Management API.
 * Requires SUPABASE_ACCESS_TOKEN (PAT with database_write).
 * Usage: node --env-file=.env.local scripts/exec-chunks-api.mjs [10 11 ...]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "data", "anaz-jsonb-batches");
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "veavfkjgtkbnggukzjds";
const ORG_ID = "304adc33-7279-4547-a73d-a2240333e814";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

function chunkFiles(requested) {
  const all = readdirSync(BATCH_DIR)
    .filter((f) => /^\d+-chunk\.sql$/.test(f))
    .sort((a, b) => Number(a) - Number(b));
  if (!requested.length) return all;
  const set = new Set(requested.map((n) => `${n}-chunk.sql`));
  return all.filter((f) => set.has(f));
}

async function runQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  return text;
}

async function main() {
  if (!TOKEN) {
    console.error("Missing SUPABASE_ACCESS_TOKEN");
    process.exit(1);
  }

  const requested = process.argv.slice(2);
  const files = chunkFiles(requested);
  if (!files.length) {
    console.error("No chunk files matched");
    process.exit(1);
  }

  const results = [];
  for (const file of files) {
    const query = readFileSync(join(BATCH_DIR, file), "utf8");
    process.stdout.write(`executing ${file} (${query.length} bytes)... `);
    try {
      await runQuery(query);
      console.log("OK");
      results.push({ file, ok: true });
    } catch (e) {
      console.log("FAIL");
      console.error(`  ${e.message}`);
      results.push({ file, ok: false, error: e.message });
    }
  }

  try {
    const countJson = await runQuery(
      `select count(*)::int as products from products where org_id = '${ORG_ID}' and is_active`,
    );
    console.log(`\ncount result: ${countJson}`);
  } catch (e) {
    console.error(`count query failed: ${e.message}`);
  }

  if (results.some((r) => !r.ok)) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
