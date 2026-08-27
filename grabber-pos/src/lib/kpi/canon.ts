/**
 * Thin KPI canon — shared labels/ids for Reports, Jarvis, and future agents.
 * Values still come from existing ledgers (sales / inventory); this file is the
 * vocabulary contract so tools don't invent alternate metric names.
 */
export const KPI_CANON = [
  {
    id: "sales_today",
    label: "Sales today",
    unit: "LKR",
    source: "sales",
    window: "today",
  },
  {
    id: "sales_7d",
    label: "Sales last 7 days",
    unit: "LKR",
    source: "sales",
    window: "7d",
  },
  {
    id: "sales_28d",
    label: "Sales last 28 days",
    unit: "LKR",
    source: "sales",
    window: "28d",
  },
  {
    id: "aov_7d",
    label: "Average order value (7d)",
    unit: "LKR",
    source: "sales",
    window: "7d",
  },
  {
    id: "orders_7d",
    label: "Orders (7d)",
    unit: "count",
    source: "sales",
    window: "7d",
  },
  {
    id: "top_products_7d",
    label: "Top products (7d)",
    unit: "rank",
    source: "sales_lines",
    window: "7d",
  },
  {
    id: "slow_movers_28d",
    label: "Slow movers (28d)",
    unit: "rank",
    source: "sales_lines",
    window: "28d",
  },
  {
    id: "low_stock",
    label: "Low stock SKUs",
    unit: "count",
    source: "inventory",
    window: "now",
  },
  {
    id: "stock_value",
    label: "Stock value (cost)",
    unit: "LKR",
    source: "inventory",
    window: "now",
  },
  {
    id: "whatsapp_open_threads",
    label: "Open WhatsApp threads needing staff",
    unit: "count",
    source: "whatsapp",
    window: "now",
  },
] as const;

export type KpiId = (typeof KPI_CANON)[number]["id"];

export function kpiById(id: string) {
  return KPI_CANON.find((k) => k.id === id) ?? null;
}

export function kpiCatalog() {
  return KPI_CANON.map((k) => ({
    id: k.id,
    label: k.label,
    unit: k.unit,
    source: k.source,
    window: k.window,
  }));
}
