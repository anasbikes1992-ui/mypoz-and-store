import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "data/anaz-storefront-publish.sql"), "utf8");
const ORG = "304adc33-7279-4547-a73d-a2240333e814";

for (const k of ["commerce", "website", "settings", "tenant"]) {
  const needle = `'${k}', `;
  const idx = sql.indexOf(needle);
  if (idx < 0) {
    console.log("missing", k);
    continue;
  }
  const start = idx + needle.length;
  const end = sql.indexOf("::jsonb", start) + "::jsonb".length;
  const lit = sql.slice(start, end);
  const stmt = `insert into app_documents (org_id, key, data) values ('${ORG}'::uuid, '${k}', ${lit}) on conflict (org_id, key) do update set data = excluded.data;`;
  fs.writeFileSync(path.join(root, `data/anaz-doc-${k}.sql`), stmt);
  console.log(k, stmt.length);
}
