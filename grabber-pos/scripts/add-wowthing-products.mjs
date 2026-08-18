import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const productsPath = join(root, "src/data/products.json");

const wowProducts = [
  {
    id: "WOW001",
    name: "Smart Wireless Earbuds Pro (wowthing.lk)",
    nameLocal: "ස්මාර්ට් ඉයර්බඩ්ස් ප්ලස්",
    barcodes: ["5060123456789"],
    brand: "WowThing",
    stockDate: "2026-07-26",
    costPrice: 4200,
    salePrice: 6500,
    wholesalePrice: 6000,
    maxDiscount: 20,
    singleDiscount: 0,
    quantity: 45,
    category: "Electronics",
    expireDate: null,
    warrantyMonths: 12,
    supplier: "WowThing Direct",
  },
  {
    id: "WOW002",
    name: "Ultra HD Smart Watch Series 9 (wowthing.lk)",
    nameLocal: "අල්ට්‍රා ස්මාර්ට් වොච්",
    barcodes: ["5060123456796"],
    brand: "WowThing",
    stockDate: "2026-07-26",
    costPrice: 8500,
    salePrice: 12900,
    wholesalePrice: 12000,
    maxDiscount: 20,
    singleDiscount: 0,
    quantity: 30,
    category: "Electronics",
    expireDate: null,
    warrantyMonths: 12,
    supplier: "WowThing Direct",
  },
  {
    id: "WOW003",
    name: "Fast Charging Powerbank 20000mAh (wowthing.lk)",
    nameLocal: "ෆාස්ට් චාජින් පවර්බෑන්ක්",
    barcodes: ["5060123456802"],
    brand: "WowThing",
    stockDate: "2026-07-26",
    costPrice: 5600,
    salePrice: 8400,
    wholesalePrice: 8000,
    maxDiscount: 20,
    singleDiscount: 0,
    quantity: 60,
    category: "Electronics",
    expireDate: null,
    warrantyMonths: 12,
    supplier: "WowThing Direct",
  },
  {
    id: "WOW004",
    name: "Bluetooth Speaker Heavy Bass (wowthing.lk)",
    nameLocal: "බ්ලූටූත් ස්පීකර්",
    barcodes: ["5060123456819"],
    brand: "WowThing",
    stockDate: "2026-07-26",
    costPrice: 4800,
    salePrice: 7200,
    wholesalePrice: 6800,
    maxDiscount: 20,
    singleDiscount: 0,
    quantity: 25,
    category: "Electronics",
    expireDate: null,
    warrantyMonths: 6,
    supplier: "WowThing Direct",
  },
  {
    id: "WOW005",
    name: "Type-C Braided Fast Cable 65W (wowthing.lk)",
    nameLocal: "ටයිප්-සී ෆාස්ට් කේබල්",
    barcodes: ["5060123456826"],
    brand: "WowThing",
    stockDate: "2026-07-26",
    costPrice: 800,
    salePrice: 1500,
    wholesalePrice: 1350,
    maxDiscount: 20,
    singleDiscount: 0,
    quantity: 100,
    category: "Electronics",
    expireDate: null,
    warrantyMonths: 6,
    supplier: "WowThing Direct",
  },
];

console.log("→ Prepending wowthing.lk products to src/data/products.json");
const existing = JSON.parse(readFileSync(productsPath, "utf8"));
const filtered = existing.filter((p) => !p.id.startsWith("WOW"));
const updated = [...wowProducts, ...filtered];
writeFileSync(productsPath, JSON.stringify(updated));
console.log(`✓ Updated products.json: Total ${updated.length} products`);

// Now seed to Supabase if credentials available
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && serviceKey) {
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });

  async function seedSupabase() {
    console.log("→ Syncing wowthing.lk products to Supabase DB...");
    const { data: orgs } = await db.from("organizations").select("id").limit(1);
    const orgId = orgs?.[0]?.id;
    if (!orgId) return;

    const { data: branches } = await db.from("branches").select("id").eq("org_id", orgId).limit(1);
    const branchId = branches?.[0]?.id;

    // Get or create Electronics category
    let { data: cat } = await db.from("categories").select("id").eq("org_id", orgId).eq("name", "Electronics").single();
    if (!cat) {
      const { data: newCat } = await db.from("categories").insert({ org_id: orgId, name: "Electronics" }).select().single();
      cat = newCat;
    }

    for (const p of wowProducts) {
      const { data: insertedProduct } = await db.from("products").upsert({
        org_id: orgId,
        sku: p.id,
        name: p.name,
        name_local: p.nameLocal,
        brand: p.brand,
        category_id: cat.id,
        cost_price: p.costPrice,
        sale_price: p.salePrice,
        wholesale_price: p.wholesalePrice,
        max_discount: p.maxDiscount,
        single_discount: p.singleDiscount,
        warranty_months: p.warrantyMonths,
        online_visible: true,
        slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      }, { onConflict: "org_id,sku" }).select().single();

      if (insertedProduct && p.barcodes.length) {
        await db.from("product_barcodes").upsert(
          p.barcodes.map((b) => ({ org_id: orgId, product_id: insertedProduct.id, barcode: b })),
          { onConflict: "org_id,barcode", ignoreDuplicates: true }
        );
      }

      if (insertedProduct && branchId) {
        await db.from("branch_stock").upsert({
          branch_id: branchId,
          product_id: insertedProduct.id,
          quantity: p.quantity,
        }, { onConflict: "branch_id,product_id" });
      }
    }
    console.log("✓ Supabase sync complete for wowthing.lk products");
  }

  seedSupabase().catch((e) => console.error("Supabase seed warning:", e.message));
}
