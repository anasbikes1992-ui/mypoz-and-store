/**
 * Build a durable Shopping Station backup package (no Excel export needed).
 * Copies source CSV + writes Excel-openable UTF-8 CSV + JSON slim + manifest.
 *
 *   node scripts/backup-shopping-station.mjs
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = join(root, "data", "backups", `shopping-station-${stamp}`);
mkdirSync(outDir, { recursive: true });

const downloadsCsv = "C:\\Users\\pc\\Downloads\\Products data.csv";
const catalogJson = join(root, "data", "anaz-import-catalog.json");
const slimJson = join(root, "data", "anaz-import-slim.json");
const batchesDir = join(root, "data", "anaz-jsonb-batches");
const imagesDir = join(root, "data", "shopping-station-images");

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const manifest = {
  createdAt: new Date().toISOString(),
  purpose:
    "Shopping Station catalogue backup for Anaz Store import (Excel-openable CSV included)",
  sources: {},
  counts: {},
  files: [],
};

if (existsSync(downloadsCsv)) {
  const dest = join(outDir, "Products-data-source.csv");
  copyFileSync(downloadsCsv, dest);
  manifest.sources.downloadsCsv = downloadsCsv;
  manifest.files.push({
    name: "Products-data-source.csv",
    bytes: statSync(dest).size,
    role: "original WooCommerce/Shopping Station export from Downloads",
  });
}

if (existsSync(catalogJson)) {
  copyFileSync(catalogJson, join(outDir, "anaz-import-catalog.json"));
  const products = JSON.parse(readFileSync(catalogJson, "utf8"));
  const list = Array.isArray(products)
    ? products
    : products.products || products.items || [];
  manifest.counts.catalogJson = list.length;
  manifest.files.push({
    name: "anaz-import-catalog.json",
    bytes: statSync(catalogJson).size,
    role: "parsed sellable catalogue used for MyPoz import",
  });

  // Excel-openable UTF-8 CSV with BOM
  const headers = [
    "sku",
    "slug",
    "name",
    "brand",
    "category",
    "description",
    "sale_price",
    "compare_at_price",
    "featured",
    "image_url",
    "quantity",
    "barcode",
  ];
  const rows = [headers.join(",")];
  for (const p of list) {
    rows.push(
      [
        p.sku ?? p.s ?? p.id,
        p.slug ?? p.g ?? "",
        p.name ?? p.n ?? "",
        p.brand ?? p.b ?? "",
        p.category ?? p.c ?? "",
        p.description ?? p.d ?? "",
        p.salePrice ?? p.sale_price ?? p.p ?? "",
        p.compareAtPrice ?? p.compare_at_price ?? p.m ?? "",
        p.featured ?? p.f ?? 0,
        p.imageUrl ?? p.image_url ?? p.image_src ?? p.i ?? "",
        p.quantity ?? p.q ?? "",
        p.barcode ?? p.a ?? p.sku ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const csvPath = join(outDir, "shopping-station-catalog-excel.csv");
  writeFileSync(csvPath, "\uFEFF" + rows.join("\n"), "utf8");
  manifest.counts.excelCsvRows = list.length;
  manifest.files.push({
    name: "shopping-station-catalog-excel.csv",
    bytes: statSync(csvPath).size,
    role: "UTF-8 BOM CSV — open directly in Excel",
  });
} else {
  console.warn("missing", catalogJson);
}

if (existsSync(slimJson)) {
  copyFileSync(slimJson, join(outDir, "anaz-import-slim.json"));
  manifest.files.push({
    name: "anaz-import-slim.json",
    bytes: statSync(slimJson).size,
    role: "slim import payload",
  });
}

if (existsSync(batchesDir)) {
  const chunkNames = readdirSync(batchesDir)
    .filter((f) => /^\d+-chunk\.sql$/.test(f) || f === "00-setup.sql")
    .sort();
  mkdirSync(join(outDir, "sql-chunks"), { recursive: true });
  for (const f of chunkNames) {
    copyFileSync(join(batchesDir, f), join(outDir, "sql-chunks", f));
  }
  manifest.counts.sqlChunks = chunkNames.length;
  manifest.files.push({
    name: "sql-chunks/",
    bytes: chunkNames.reduce(
      (n, f) => n + statSync(join(batchesDir, f)).size,
      0,
    ),
    role: "Supabase-ready DO blocks for products + stock",
  });
}

if (existsSync(imagesDir)) {
  const n = readdirSync(imagesDir).filter((f) =>
    /\.(jpe?g|png|webp|gif)$/i.test(f),
  ).length;
  manifest.counts.localImages = n;
  manifest.sources.imagesDir = imagesDir;
  writeFileSync(
    join(outDir, "IMAGES-NOTE.txt"),
    `Local image folder not copied (large): ${imagesDir}\nFile count: ${n}\nProduct rows use shoppingstation.lk image URLs in CSV/JSON.\n`,
  );
}

writeFileSync(join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
writeFileSync(
  join(outDir, "README.txt"),
  [
    "Shopping Station backup package",
    `Created: ${manifest.createdAt}`,
    "",
    "Open shopping-station-catalog-excel.csv in Excel (File → Open).",
    "Products-data-source.csv is the original Downloads export.",
    "sql-chunks/ are ready for Supabase execute_sql (10–17 + 00-setup).",
    "Images remain in data/shopping-station-images (not duplicated here).",
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ ok: true, outDir, manifest }, null, 2));
