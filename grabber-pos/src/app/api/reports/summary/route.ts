import { NextRequest, NextResponse } from "next/server";
import type { Product, Sale } from "@/lib/types";
import { requireTenantSession } from "@/lib/server/auth-session";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { listSales } from "@/lib/server/sales-repo";
import { allProducts } from "@/lib/server/product-repo";
import { salesByChannel } from "@/lib/commerce/channel-report";

/**
 * Server-side reporting. Durable path uses report_sales_summary RPC
 * (SQL aggregation — not a 200-row browser calc).
 */
export async function GET(req: NextRequest) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  const url = req.nextUrl;
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const branchId = url.searchParams.get("branch");

  if (isSupabaseEnabled) {
    try {
      const db = await createServerSupabase();
      const { data, error } = await (db as any).rpc("report_sales_summary", {
        p_from: dateFrom ? new Date(dateFrom).toISOString() : null,
        p_to: dateTo ? new Date(dateTo).toISOString() : null,
        p_branch: branchId && /^[0-9a-f-]{36}$/i.test(branchId) ? branchId : null,
      });
      if (error) throw new Error(error.message);

      const summary = data as Record<string, unknown>;
      // Keep legacy shape for existing UI while exposing authoritative metrics.
      const report = {
        revenue: Number(summary.net_sales ?? 0),
        count: Number(summary.transaction_count ?? 0),
        avg: Number(summary.avg_basket ?? 0),
        itemsSold: Number(summary.items_sold ?? 0),
        byMethod: (summary.by_method as unknown[]) ?? [],
        byDay: [] as { label: string; total: number }[],
        byChannel: [] as ReturnType<typeof salesByChannel>,
        topProducts: [] as { name: string; qty: number }[],
        grossSales: Number(summary.gross_sales ?? 0),
        discounts: Number(summary.discounts ?? 0),
        refunds: Number(summary.refunds ?? 0),
        netSales: Number(summary.net_sales ?? 0),
        tax: Number(summary.tax ?? 0),
        cogs: Number(summary.cogs ?? 0),
        grossProfit: Number(summary.gross_profit ?? 0),
        marginPct: Number(summary.margin_pct ?? 0),
        byCashier: (summary.by_cashier as unknown[]) ?? [],
        from: summary.from,
        to: summary.to,
      };

      return NextResponse.json({
        success: true,
        data: {
          report,
          deadStock: [],
          leaderboard: (summary.by_cashier as unknown[]) ?? [],
          salesCount: report.count,
          productCount: null,
          authoritative: true,
        },
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Report failed";
      return NextResponse.json(
        { success: false, data: null, error: message },
        { status: message.includes("AUTH") || message.includes("ROLE") ? 403 : 500 },
      );
    }
  }

  if (requireSupabase) {
    return NextResponse.json(
      { success: false, data: null, error: "DEPENDENCY_UNAVAILABLE" },
      { status: 503 },
    );
  }

  // Demo-only local aggregation
  const [sales, products] = [await listSales(5000), allProducts()];
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
      authoritative: false,
    },
    error: null,
  });
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

  return {
    revenue,
    count,
    avg: count ? revenue / count : 0,
    itemsSold,
    byMethod: [...methodMap.entries()].map(([method, value]) => ({ method, ...value })),
    byDay: [] as { label: string; total: number }[],
    byChannel: salesByChannel(active),
    topProducts: [] as { name: string; qty: number }[],
  };
}

function buildDeadStock(products: Product[], sales: Sale[]) {
  const active = sales.filter((sale) => sale.status !== "voided");
  const soldIds = new Set<string>();
  for (const sale of active) {
    for (const line of sale.lines) soldIds.add(line.productId);
  }
  return products
    .filter((product) => product.quantity > 0)
    .filter((product) => !soldIds.has(product.id))
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
