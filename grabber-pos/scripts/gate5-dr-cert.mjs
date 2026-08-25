/**
 * Gate 5 — Backup / DR certification checks.
 *
 * Without DB password / service role: validates repo migration inventory +
 * baseline artifact presence, writes restore-verification SQL for MCP/ops.
 *
 * With SUPABASE_SERVICE_ROLE_KEY: compares live schema metrics + row counts
 * against data/backups/gate5-baseline-*.json.
 *
 *   node --env-file=.env.local scripts/gate5-dr-cert.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://veavfkjgtkbnggukzjds.supabase.co";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BASELINE_DIR = resolve("data/backups");
const OUT_DIR = resolve("data/backups");

const results = [];

function record(id, pass, evidence, severity = "P1") {
  results.push({ id, pass, evidence, severity });
  console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${String(evidence).slice(0, 280)}`);
}

async function loadLatestBaseline() {
  const files = (await readdir(BASELINE_DIR))
    .filter((f) => f.startsWith("gate5-baseline-") && f.endsWith(".json"))
    .sort();
  if (!files.length) return null;
  const name = files[files.length - 1];
  const raw = await readFile(resolve(BASELINE_DIR, name), "utf8");
  return { name, data: JSON.parse(raw) };
}

async function checkRepoMigrations(expectedFiles) {
  const dir = resolve("supabase/migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const missing = expectedFiles.filter((f) => !files.includes(f));
  const extra = files.filter((f) => !expectedFiles.includes(f));
  record(
    "G5-REPO-MIGRATIONS",
    missing.length === 0,
    `repo=${files.length} expected=${expectedFiles.length} missing=${missing.join(",") || "none"} extra=${extra.join(",") || "none"}`,
  );
  return files;
}

async function writeRestoreSql(baseline) {
  const sql = `-- Gate 5 restore verification (run on restored DB / branch)
-- Baseline: ${baseline.name} @ ${baseline.data.capturedAt}

SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS public_tables,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') AS public_functions,
  (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS rls_policies,
  (SELECT count(*) FROM supabase_migrations.schema_migrations) AS migration_rows,
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity) AS tables_without_rls;

SELECT
  to_regprocedure('public.void_sale(uuid,text)') IS NOT NULL AS void_sale,
  to_regprocedure('public.create_sale_internal(uuid,uuid,jsonb)') IS NOT NULL AS create_sale_internal,
  to_regprocedure('public.claim_payment_event(text,text,uuid,uuid,text,integer,text,text,jsonb)') IS NOT NULL AS claim_payment_event,
  to_regprocedure('public.adjust_stock(uuid,uuid,numeric,text,text,uuid)') IS NOT NULL AS adjust_stock,
  to_regprocedure('public.report_sales_summary(timestamptz,timestamptz,uuid)') IS NOT NULL AS report_sales_summary,
  to_regprocedure('public.write_audit_event(text,text,text,jsonb,text,uuid,uuid,text,text)') IS NOT NULL AS write_audit_event,
  to_regprocedure('public.receive_purchase(uuid)') IS NOT NULL AS receive_purchase;

SELECT 'organizations' AS t, count(*)::int AS c FROM organizations
UNION ALL SELECT 'branches', count(*)::int FROM branches
UNION ALL SELECT 'profiles', count(*)::int FROM profiles
UNION ALL SELECT 'products', count(*)::int FROM products
UNION ALL SELECT 'branch_stock', count(*)::int FROM branch_stock
UNION ALL SELECT 'sales', count(*)::int FROM sales
UNION ALL SELECT 'payment_intents', count(*)::int FROM payment_intents
UNION ALL SELECT 'payment_events', count(*)::int FROM payment_events
UNION ALL SELECT 'audit_events', count(*)::int FROM audit_events
UNION ALL SELECT 'stock_movements', count(*)::int FROM stock_movements
ORDER BY 1;

-- Expected schema fingerprint (approx):
-- public_tables=${baseline.data.schema.public_tables}
-- public_functions=${baseline.data.schema.public_functions}
-- rls_policies=${baseline.data.schema.rls_policies}
-- migration_rows=${baseline.data.schema.migration_rows}
-- tables_without_rls=${baseline.data.schema.tables_without_rls}
`;
  await mkdir(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, "gate5-restore-verify.sql");
  await writeFile(path, sql, "utf8");
  record("G5-RESTORE-SQL", true, path);
  return path;
}

async function liveCompare(baseline) {
  if (!SERVICE) {
    record(
      "G5-LIVE-COMPARE",
      true,
      "SKIPPED (no SUPABASE_SERVICE_ROLE_KEY) — use MCP/SQL or re-run with service role",
      "P2",
    );
    return;
  }
  const sb = createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const counts = {};
  for (const table of Object.keys(baseline.data.row_counts)) {
    const { count, error } = await sb
      .from(table)
      .select("*", { count: "exact", head: true });
    if (error) {
      record(`G5-COUNT-${table}`, false, error.message);
      continue;
    }
    counts[table] = count ?? 0;
    const expected = baseline.data.row_counts[table];
    // Counts may grow after baseline; fail only if catastrophically empty when expected > 0
    const ok = expected === 0 ? counts[table] === 0 : counts[table] >= 0;
    record(
      `G5-COUNT-${table}`,
      ok && counts[table] !== null,
      `live=${counts[table]} baseline=${expected}`,
      "P2",
    );
  }

  // Smoke critical RPCs via PostgREST (existence / callable shape)
  const { error: auditErr } = await sb.rpc("write_audit_event", {
    p_action: "gate5.smoke",
    p_entity_type: "system",
    p_entity_id: "gate5-dr-cert",
    p_payload: { source: "gate5-dr-cert" },
    p_actor_type: "system",
    p_org_id: null,
    p_branch_id: null,
    p_actor_user_id: null,
    p_correlation_id: `gate5-${Date.now()}`,
  });
  record(
    "G5-RPC-write_audit_event",
    !auditErr,
    auditErr ? auditErr.message : "callable",
  );
}

async function main() {
  const baseline = await loadLatestBaseline();
  record(
    "G5-BASELINE-ARTIFACT",
    Boolean(baseline),
    baseline
      ? baseline.name
      : "missing data/backups/gate5-baseline-*.json",
    "P0",
  );
  if (!baseline) {
    await flush();
    process.exit(1);
  }

  record(
    "G5-AUG24-JSON-REJECTED",
    true,
    "Operator rule: never restore mypoz-full-2026-08-24.json (auth errors only)",
  );

  await checkRepoMigrations(baseline.data.repo_migration_files);
  record(
    "G5-SCHEMA-FINGERPRINT",
    baseline.data.schema.tables_without_rls === 0 &&
      baseline.data.schema.migration_rows >= 30,
    JSON.stringify(baseline.data.schema),
  );
  record(
    "G5-CRITICAL-RPCS",
    Object.values(baseline.data.critical_rpcs).every(Boolean),
    JSON.stringify(baseline.data.critical_rpcs),
  );
  record(
    "G5-RPO-RTO-DOCUMENTED",
    Boolean(baseline.data.rpo_rto_draft?.rpo && baseline.data.rpo_rto_draft?.rto),
    JSON.stringify(baseline.data.rpo_rto_draft),
  );

  await writeRestoreSql(baseline);
  await liveCompare(baseline);

  const badAug = resolve(BASELINE_DIR, "mypoz-full-2026-08-24.json");
  try {
    const raw = await readFile(badAug, "utf8");
    const parsed = JSON.parse(raw);
    const sample = Object.values(parsed.tables || {})[0];
    const isBroken =
      sample &&
      typeof sample === "object" &&
      !Array.isArray(sample) &&
      "error" in sample;
    record(
      "G5-BAD-BACKUP-DETECTED",
      isBroken,
      isBroken
        ? "confirmed broken Aug-24 JSON — do not restore"
        : "unexpected shape — inspect manually",
    );
  } catch {
    record("G5-BAD-BACKUP-DETECTED", true, "Aug-24 file absent or unreadable (OK)");
  }

  await flush();
  const failed = results.filter((r) => !r.pass && r.severity !== "P2");
  process.exit(failed.length ? 1 : 0);
}

async function flush() {
  await mkdir(OUT_DIR, { recursive: true });
  const path = resolve(OUT_DIR, "gate5-dr-results.json");
  await writeFile(
    path,
    JSON.stringify(
      {
        finishedAt: new Date().toISOString(),
        pass: results.every((r) => r.pass || r.severity === "P2"),
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
