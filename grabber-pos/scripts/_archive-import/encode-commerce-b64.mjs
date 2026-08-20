import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sql = fs.readFileSync(path.join(root, "data/anaz-doc-commerce.sql"), "utf8");
const m = sql.match(/'commerce', '(.*)'::jsonb/s);
if (!m) {
  console.error("no match");
  process.exit(1);
}
const json = m[1].replace(/''/g, "'");
const b64 = Buffer.from(json, "utf8").toString("base64");
const ORG = "304adc33-7279-4547-a73d-a2240333e814";
const q = `insert into app_documents (org_id, key, data) values ('${ORG}'::uuid, 'commerce', convert_from(decode('${b64}','base64'),'utf8')::jsonb) on conflict (org_id, key) do update set data = excluded.data returning key, pg_column_size(data) as bytes;`;
fs.writeFileSync(path.join(root, "data/anaz-commerce-b64.sql"), q);
console.log(JSON.stringify({ b64len: b64.length, sqllen: q.length }));
