#!/usr/bin/env node
/**
 * GRABBER POS Studio — Supabase seed.
 *
 * Creates the demo organization, main branch, register, an admin auth user +
 * profile, then bulk-loads the product catalog (categories, products,
 * barcodes, opening stock) from src/data/products.json.
 *
 * Requires (in .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD.
 *
 * Run: node --env-file=.env.local scripts/seed.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const ORG_NAME = process.env.SEED_ORG_NAME ?? "Grabber Demo Store";
const BRANCH_CODE = process.env.SEED_BRANCH_CODE ?? "MAIN";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@grabber.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "change-me";
const CHUNK = 500;

async function main() {
  console.log("→ Organization + branch");
  const { data: org } = await db
    .from("organizations")
    .insert({ name: ORG_NAME, slug: slugify(ORG_NAME) })
    .select()
    .single();

  const { data: branch } = await db
    .from("branches")
    .insert({ org_id: org.id, name: "Main Branch", code: BRANCH_CODE })
    .select()
    .single();

  await db
    .from("registers")
    .insert({ branch_id: branch.id, name: "Register 1" });

  console.log("→ Admin user");
  const { data: created, error: userErr } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });
  if (userErr) throw userErr;
  await db.from("profiles").insert({
    id: created.user.id,
    org_id: org.id,
    full_name: "Store Owner",
    role: "owner",
  });
  await db
    .from("branch_members")
    .insert({ branch_id: branch.id, user_id: created.user.id });

  console.log("→ Catalog");
  const products = JSON.parse(
    readFileSync(join(root, "src/data/products.json"), "utf8"),
  );

  // Categories
  const catNames = [...new Set(products.map((p) => p.category))];
  const { data: cats } = await db
    .from("categories")
    .insert(catNames.map((name) => ({ org_id: org.id, name })))
    .select();
  const catId = new Map(cats.map((c) => [c.name, c.id]));

  // Products (chunked) + collect barcodes + opening stock
  let n = 0;
  for (const batch of chunk(products, CHUNK)) {
    const rows = batch.map((p) => ({
      org_id: org.id,
      sku: p.id,
      slug:
        (String(p.name || "product")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "product") +
        "-" +
        String(p.id).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
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
    const { data: inserted } = await db.from("products").insert(rows).select("id, sku");
    const idBySku = new Map(inserted.map((r) => [r.sku, r.id]));

    const barcodes = [];
    const stock = [];
    for (const p of batch) {
      const pid = idBySku.get(p.id);
      for (const bc of p.barcodes ?? []) {
        barcodes.push({ org_id: org.id, product_id: pid, barcode: bc });
      }
      stock.push({
        branch_id: branch.id,
        product_id: pid,
        quantity: p.quantity ?? 0,
        expire_date: p.expireDate ?? null,
      });
    }
    if (barcodes.length) await db.from("product_barcodes").upsert(barcodes, { onConflict: "org_id,barcode", ignoreDuplicates: true });
    if (stock.length) await db.from("branch_stock").insert(stock);

    n += batch.length;
    process.stdout.write(`\r  ${n}/${products.length} products`);
  }
  console.log("\n✓ Seed complete");
  console.log(`  Login: ${ADMIN_EMAIL}`);
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
}
function* chunk(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

main().catch((e) => {
  console.error("\nSeed failed:", e.message);
  process.exit(1);
});
