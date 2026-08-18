import type { Product } from "@/lib/types";

export interface StockAlert {
  product: Product;
  currentStock: number;
  reorderLevel: number;
  severity: "critical" | "warning";
}

export function evaluateStockAlerts(products: Product[], defaultThreshold = 5): StockAlert[] {
  const alerts: StockAlert[] = [];
  for (const p of products) {
    const threshold = p.quantity <= 2 ? 2 : defaultThreshold;
    if (p.quantity <= threshold) {
      alerts.push({
        product: p,
        currentStock: p.quantity,
        reorderLevel: threshold,
        severity: p.quantity <= 0 ? "critical" : "warning",
      });
    }
  }
  return alerts.sort((a, b) => a.currentStock - b.currentStock);
}
