import { NextResponse } from "next/server";
import type { Product, Sale } from "@/lib/types";
import { requireTenantSession } from "@/lib/server/auth-session";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { listSales } from "@/lib/server/sales-repo";
import { allProducts } from "@/lib/server/product-repo";
import { salesByChannel } from "@/lib/commerce/channel-report";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  const [sales, products] = isSupabaseEnabled
    ? await readDurableData()
    : [await listSales(5000), allProducts()];

  const report = buildReport(sales);
  const deadStock = buildDeadStock(products, sales);
  const leaderboard = buildLeaderboard(sales);

  return NextResponse.json({
    success: true,
    data: {
      report,
      deadStock,
      leaderboard,
      salesCount: sales.length,
      productCount: products.length,
    },
    error: null,
  });
}

async function readDurableData(): Promise<[Sale[], Product[]]> {
  const db = await createServerSupabase();
  const [salesRes, productsRes] = await Promise.all([
    db
      .from("sales")
      .select(
        "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, status, void_reason, voided_at, source, fulfillment_status, payment_status, delivery_address, delivery_fee, cod_fee, sale_lines(product_id, name, unit_price, quantity, discount, line_total)",
      )
      .order("created_at", { ascending: false }),
    db
      .from("products")
      .select(
        "id, name, name_local, brand, cost_price, sale_price, wholesale_price, max_discount, single_discount, reorder_level, warranty_months, image_url, is_active",
      )
      .eq("is_active", true),
  ]);
  if (salesRes.error) throw new Error(salesRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);

  const sales = ((salesRes.data ?? []) as any[]).map((row) => ({
    id: row.receipt_no ?? row.id,
    createdAt: row.created_at,
    subtotal: Number(row.subtotal ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: row.payment_method,
    isWholesale: row.payment_method === "wholesale",
    customerName: row.customer_name ?? null,
    customerMobile: row.customer_mobile ?? null,
    employee: row.employee ?? null,
    cashReceived: row.cash_received != null ? Number(row.cash_received) : null,
    change: row.change_due != null ? Number(row.change_due) : null,
    status: row.status ?? "completed",
    voidReason: row.void_reason ?? null,
    voidedAt: row.voided_at ?? null,
    source: row.source ?? "POS",
    fulfillmentStatus: row.fulfillment_status ?? "pending",
    paymentStatus: row.payment_status ?? "paid",
    deliveryAddress: row.delivery_address ?? null,
    deliveryFee: Number(row.delivery_fee ?? 0),
    codFee: Number(row.cod_fee ?? 0),
    lines: (row.sale_lines ?? []).map((line: any) => ({
      productId: line.product_id ?? "",
      name: line.name,
      unitPrice: Number(line.unit_price ?? 0),
      quantity: Number(line.quantity ?? 0),
      discount: Number(line.discount ?? 0),
      lineTotal: Number(line.line_total ?? 0),
    })),
  })) as Sale[];

  const stockMap = new Map<string, number>();
  const stockRes = await db
    .from("branch_stock")
    .select("product_id, quantity");
  if (stockRes.error) throw new Error(stockRes.error.message);
  for (const row of (stockRes.data ?? []) as any[]) {
    stockMap.set(String(row.product_id), (stockMap.get(String(row.product_id)) ?? 0) + Number(row.quantity ?? 0));
  }

  const products = ((productsRes.data ?? []) as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    nameLocal: row.name_local ?? null,
    barcodes: [],
    brand: row.brand ?? null,
    stockDate: null,
    costPrice: Number(row.cost_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    wholesalePrice: row.wholesale_price != null ? Number(row.wholesale_price) : null,
    maxDiscount: Number(row.max_discount ?? 0),
    singleDiscount: Number(row.single_discount ?? 0),
    quantity: Number(stockMap.get(String(row.id)) ?? 0),
    category: "",
    expireDate: null,
    warrantyMonths: Number(row.warranty_months ?? 0),
    supplier: null,
    imageUrl: row.image_url ?? null,
    onlineVisible: true,
  })) as Product[];

  return [sales, products];
}

function buildReport(sales: Sale[]) {
  const active = sales.filter((sale) => sale.status !== "voided");
  const revenue = active.reduce((sum, sale) => sum + sale.total, 0);
  const count = active.length;
  const itemsSold = active.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
    0,
  );

  const methodMap = new Map<string, { count: number; total: number }>();
  for (const sale of active) {
    const current = methodMap.get(sale.paymentMethod) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += sale.total;
    methodMap.set(sale.paymentMethod, current);
  }

  const dayMap = new Map<string, number>();
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
    });
    dayMap.set(key, 0);
  }
  for (const sale of active) {
    const key = sale.createdAt.slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + sale.total);
  }

  const productMap = new Map<string, number>();
  for (const sale of active) {
    for (const line of sale.lines) {
      productMap.set(line.name, (productMap.get(line.name) ?? 0) + line.quantity);
    }
  }

  return {
    revenue,
    count,
    avg: count ? revenue / count : 0,
    itemsSold,
    byMethod: [...methodMap.entries()].map(([method, value]) => ({ method, ...value })),
    byDay: days.map((day) => ({ label: day.label, total: dayMap.get(day.key) ?? 0 })),
    byChannel: salesByChannel(active),
    topProducts: [...productMap.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5),
  };
}

function buildDeadStock(products: Product[], sales: Sale[]) {
  const active = sales.filter((sale) => sale.status !== "voided");
  const soldIds = new Set<string>();
  const soldNames = new Set<string>();
  for (const sale of active) {
    for (const line of sale.lines) {
      soldIds.add(line.productId);
      soldNames.add(line.name);
    }
  }
  return products
    .filter((product) => product.quantity > 0)
    .filter((product) => !soldIds.has(product.id) && !soldNames.has(product.name))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 12);
}

function buildLeaderboard(sales: Sale[]) {
  const active = sales.filter((sale) => sale.status !== "voided");
  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const sale of active) {
    const name = sale.employee?.trim() || "Unassigned";
    const current = map.get(name) ?? { name, total: 0, count: 0 };
    current.total += sale.total;
    current.count += 1;
    map.set(name, current);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 10);
}
