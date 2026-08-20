import "server-only";
import * as XLSX from "xlsx";
import type { Product } from "@/lib/types";
import { allProducts, findByBarcode } from "./product-repo";

/**
 * Canonical product fields ↔ the many header spellings seen across the legacy
 * Excel exports (grocery, pharmacy, bookshop, hardware). Import is tolerant:
 * headers are normalized (lowercased, non-alphanumerics stripped) and matched.
 */
const HEADER_MAP: Record<string, keyof CanonRow> = {
  // name
  name: "name",
  producteng: "name",
  productenglish: "name",
  productname: "name",
  itemname: "name",
  // local name
  productsin: "nameLocal",
  namelocal: "nameLocal",
  sinhala: "nameLocal",
  // barcode
  barcode: "barcodes",
  barcodes: "barcodes",
  barcodeno: "barcodes",
  // brand
  brand: "brand",
  brandname: "brand",
  // cost
  cost: "costPrice",
  costprice: "costPrice",
  buyprice: "costPrice",
  purchaseprice: "costPrice",
  // sale
  price: "salePrice",
  saleprice: "salePrice",
  salesprice: "salePrice",
  sellingprice: "salePrice",
  sellprice: "salePrice",
  // wholesale
  wholesaleprice: "wholesalePrice",
  wholesalesprice: "wholesalePrice",
  wholesale: "wholesalePrice",
  whs: "wholesalePrice",
  whp: "wholesalePrice",
  coopwholesaleprice: "wholesalePrice",
  // discounts
  maxdiscount: "maxDiscount",
  maxdiscountamount: "maxDiscount",
  maximumdiscount: "maxDiscount",
  max: "maxDiscount",
  singlediscount: "singleDiscount",
  sindis: "singleDiscount",
  singledis: "singleDiscount",
  defaultdiscount: "singleDiscount",
  // quantity
  quantity: "quantity",
  totalqty: "quantity",
  totalquantity: "quantity",
  quantitystock: "quantity",
  qty: "quantity",
  stock: "quantity",
  // category
  category: "category",
  categoryname: "category",
  // expiry
  expiredate: "expireDate",
  expiredateymd: "expireDate",
  expirydate: "expireDate",
  expiry: "expireDate",
  // warranty
  warrantymonths: "warrantyMonths",
  warranty: "warrantyMonths",
  warrenty: "warrantyMonths",
  warrentymonths: "warrantyMonths",
  // supplier
  supplier: "supplier",
  suppliername: "supplier",
};

interface CanonRow {
  name?: string;
  nameLocal?: string;
  barcodes?: string;
  brand?: string;
  costPrice?: unknown;
  salePrice?: unknown;
  wholesalePrice?: unknown;
  maxDiscount?: unknown;
  singleDiscount?: unknown;
  quantity?: unknown;
  category?: string;
  expireDate?: unknown;
  warrantyMonths?: unknown;
  supplier?: string;
}

function normalizeHeader(h: string): string {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function excelDate(v: unknown): string | null {
  if (v == null || v === "" || v === "0000-00-00") return null;
  if (typeof v === "number") {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  products: Product[];
}

/** Parse an uploaded workbook/CSV buffer into products, ready to upsert. */
export function parseProductsBuffer(buffer: Buffer): ImportResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const errors: string[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  const products: Product[] = [];

  // Next id counter beyond the existing catalog.
  let maxId = 0;
  for (const p of allProducts()) {
    const m = /^P(\d+)$/.exec(p.id);
    if (m) maxId = Math.max(maxId, Number(m[1]));
  }

  rows.forEach((raw, index) => {
    const canon: CanonRow = {};
    for (const [header, value] of Object.entries(raw)) {
      const field = HEADER_MAP[normalizeHeader(header)];
      if (field && (canon[field] === undefined || canon[field] === "")) {
        canon[field] = value as never;
      }
    }

    const name = String(canon.name ?? "").trim();
    if (!name) {
      skipped += 1;
      if (skipped <= 5) errors.push(`Row ${index + 2}: missing product name`);
      return;
    }

    const barcodes = String(canon.barcodes ?? "")
      .split(/[|,\s]+/)
      .map((b) => b.trim())
      .filter(Boolean);

    // Update an existing product when a barcode matches, else create.
    const existing = barcodes.map((b) => findByBarcode(b)).find(Boolean);
    const id = existing ? existing.id : "P" + String(++maxId).padStart(5, "0");

    products.push({
      id,
      name,
      nameLocal: canon.nameLocal ? String(canon.nameLocal).trim() : null,
      barcodes,
      brand: canon.brand ? String(canon.brand).trim() : null,
      stockDate: existing?.stockDate ?? new Date().toISOString().slice(0, 10),
      costPrice: num(canon.costPrice),
      salePrice: num(canon.salePrice),
      wholesalePrice: canon.wholesalePrice ? num(canon.wholesalePrice) : null,
      maxDiscount: num(canon.maxDiscount),
      singleDiscount: num(canon.singleDiscount),
      quantity: num(canon.quantity),
      category: canon.category ? String(canon.category).trim() : "Uncategorized",
      expireDate: excelDate(canon.expireDate),
      warrantyMonths: Math.round(num(canon.warrantyMonths)),
      supplier: canon.supplier ? String(canon.supplier).trim() : null,
    });

    if (existing) updated += 1;
    else imported += 1;
  });

  return { imported, updated, skipped, errors: errors.slice(0, 10), products };
}

const EXPORT_HEADERS = [
  ["Name", "name"],
  ["Local Name", "nameLocal"],
  ["Barcode", "barcodes"],
  ["Brand", "brand"],
  ["Cost Price", "costPrice"],
  ["Sale Price", "salePrice"],
  ["Wholesale Price", "wholesalePrice"],
  ["Max Discount", "maxDiscount"],
  ["Single Discount", "singleDiscount"],
  ["Quantity", "quantity"],
  ["Category", "category"],
  ["Expire Date", "expireDate"],
  ["Warranty (Months)", "warrantyMonths"],
  ["Supplier", "supplier"],
] as const;

function toRow(p: Product): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [header, key] of EXPORT_HEADERS) {
    const value = p[key as keyof Product];
    row[header] = Array.isArray(value) ? value.join(" ") : (value ?? "");
  }
  return row;
}

/** Full catalog as an .xlsx buffer (local seed or durable Supabase catalogue). */
export async function exportProductsBuffer(): Promise<Buffer> {
  const { listAllProductsForExport } = await import("./product-admin-store");
  const products = await listAllProductsForExport();
  const rows = products.map(toRow);
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_HEADERS.map(([h]) => h),
  });
  // json_to_sheet omits headers when rows is empty — force header row.
  if (rows.length === 0) {
    XLSX.utils.sheet_add_aoa(ws, [EXPORT_HEADERS.map(([h]) => h)], {
      origin: "A1",
    });
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Blank template with headers + two example rows. */
export function templateBuffer(): Buffer {
  const sample = [
    {
      Name: "Sample Product A",
      "Local Name": "",
      Barcode: "1234567890123",
      Brand: "Acme",
      "Cost Price": 100,
      "Sale Price": 150,
      "Wholesale Price": 130,
      "Max Discount": 10,
      "Single Discount": 0,
      Quantity: 50,
      Category: "General",
      "Expire Date": "",
      "Warranty (Months)": 0,
      Supplier: "Acme Distributors",
    },
    {
      Name: "Sample Product B",
      "Local Name": "",
      Barcode: "9876543210987 9876543210988",
      Brand: "",
      "Cost Price": 220,
      "Sale Price": 300,
      "Wholesale Price": "",
      "Max Discount": 25,
      "Single Discount": 5,
      Quantity: 12,
      Category: "Beverages",
      "Expire Date": "2026-12-31",
      "Warranty (Months)": 0,
      Supplier: "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, {
    header: EXPORT_HEADERS.map(([h]) => h),
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
