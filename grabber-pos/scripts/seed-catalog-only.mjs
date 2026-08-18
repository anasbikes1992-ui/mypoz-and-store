import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const CHUNK = 200;

function slugify(name, sku) {
  const base = String(name || "product")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "product";
  return `${base}-${String(sku).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 120);
}

const { data: orgs } = await db.from("organizations").select("id").limit(1);
if (!orgs?.length) throw new Error("no org");
const orgId = orgs[0].id;
const { data: branches } = await db.from("branches").select("id").eq("org_id", orgId).limit(1);
if (!branches?.length) throw new Error("no branch");
const branchId = branches[0].id;

const { count } = await db.from("products").select("*", { count: "exact", head: true }).eq("org_id", orgId);
if ((count ?? 0) > 0) {
  console.log("products already present:", count);
  process.exit(0);
}

const products = JSON.parse(readFileSync(join(root, "src/data/products.json"), "utf8"));
const { data: cats, error: cErr } = await db.from("categories").select("id, name").eq("org_id", orgId);
if (cErr) throw cErr;
let catId = new Map((cats ?? []).map((c) => [c.name, c.id]));

const missing = [...new Set(products.map((p) => p.category))].filter((n) => !catId.has(n));
if (missing.length) {
  const { data: added, error } = await db.from("categories").insert(missing.map((name) => ({ org_id: orgId, name }))).select();
  if (error) throw error;
  for (const c of added) catId.set(c.name, c.id);
}

let n = 0;
for (let i = 0; i < products.length; i += CHUNK) {
  const batch = products.slice(i, i + CHUNK);
  const rows = batch.map((p) => ({
    org_id: orgId,
    sku: String(p.id),
    slug: slugify(p.name, p.id),
    name: p.name,
    name_local: p.nameLocal ?? null,
    brand: p.brand ?? null,
    category_id: catId.get(p.category) ?? null,
    cost_price: p.costPrice,
    sale_price: p.salePrice,
    wholesale_price: p.wholesalePrice ?? null,
    max_discount: p.maxDiscount,
    single_discount: p.singleDiscount,
    warranty_months: p.warrantyMonths ?? 0,
  }));
  const { data: inserted, error } = await db.from("products").insert(rows).select("id, sku");
  if (error) throw error;
  const idBySku = new Map(inserted.map((r) => [r.sku, r.id]));
  const barcodes = [];
  const stock = [];
  for (const p of batch) {
    const pid = idBySku.get(String(p.id));
    for (const bc of p.barcodes ?? []) barcodes.push({ org_id: orgId, product_id: pid, barcode: bc });
    stock.push({ branch_id: branchId, product_id: pid, quantity: p.quantity ?? 0, expire_date: p.expireDate ?? null });
  }
  if (barcodes.length) {
    const { error: bErr } = await db.from("product_barcodes").upsert(barcodes, { onConflict: "org_id,barcode", ignoreDuplicates: true });
    if (bErr) throw bErr;
  }
  if (stock.length) {
    const { error: sErr } = await db.from("branch_stock").insert(stock);
    if (sErr) throw sErr;
  }
  n += batch.length;
  process.stdout.write(`\r  ${n}/${products.length}`);
}
console.log("\n✓ catalog seeded", n);
