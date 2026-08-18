import { NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { evaluateStockAlerts } from "@/lib/alerts/stock-alerts";

export async function GET() {
  const repo = await getRepository();
  const page = await repo.queryProducts({ pageSize: 500 });
  const alerts = evaluateStockAlerts(page.items);
  return NextResponse.json({
    success: true,
    data: {
      criticalCount: alerts.filter((a) => a.severity === "critical").length,
      warningCount: alerts.filter((a) => a.severity === "warning").length,
      alerts: alerts.slice(0, 50),
    },
    error: null,
  });
}
