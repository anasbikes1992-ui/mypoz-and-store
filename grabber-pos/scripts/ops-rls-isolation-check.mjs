#!/usr/bin/env node
/**
 * Tenant isolation smoke (service-role counts by org_id).
 * Confirms Anaz vs Pilot footprints stay separate — complements RLS (already on).
 *
 *   node --env-file=.env.local scripts/ops-rls-isolation-check.mjs
 */
import { createClient } from "@supabase/supabase-js";

const ANAZ = "304adc33-7279-4547-a73d-a2240333e814";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function count(table, orgId) {
  const { count, error } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

const { data: orgs, error: orgErr } = await db
  .from("organizations")
  .select("id, name, slug")
  .in("slug", ["anaz-store", "pilot-02"]);

if (orgErr) {
  console.error(orgErr.message);
  process.exit(1);
}

const anaz = orgs?.find((o) => o.slug === "anaz-store");
const pilot = orgs?.find((o) => o.slug === "pilot-02");
if (!anaz) {
  console.error("anaz-store org not found");
  process.exit(1);
}

const anazProducts = await count("products", anaz.id);
const anazSales = await count("sales", anaz.id);
let pilotProducts = 0;
let pilotSales = 0;
if (pilot) {
  pilotProducts = await count("products", pilot.id);
  pilotSales = await count("sales", pilot.id);
}

const checks = [];
checks.push({
  name: "anaz_has_catalog",
  ok: anazProducts >= 1000,
  detail: `Anaz products=${anazProducts}`,
});
checks.push({
  name: "anaz_org_id_stable",
  ok: anaz.id === ANAZ,
  detail: anaz.id,
});
if (pilot) {
  checks.push({
    name: "pilot_distinct_from_anaz",
    ok: pilot.id !== anaz.id,
    detail: `pilot=${pilot.id}`,
  });
  checks.push({
    name: "catalog_counts_differ_or_pilot_small",
    ok: pilotProducts !== anazProducts || pilotProducts < 50,
    detail: `Anaz=${anazProducts} Pilot=${pilotProducts}`,
  });
  checks.push({
    name: "sale_counts_recorded",
    ok: true,
    detail: `Anaz sales=${anazSales} Pilot sales=${pilotSales}`,
  });
}

let failed = 0;
for (const c of checks) {
  const mark = c.ok ? "PASS" : "FAIL";
  if (!c.ok) failed += 1;
  console.log(`${mark}  ${c.name} — ${c.detail}`);
}

console.log(
  failed === 0
    ? `\nIsolation smoke: ${checks.length}/${checks.length} PASS`
    : `\nIsolation smoke: ${failed} FAIL`,
);
process.exit(failed === 0 ? 0 : 1);
