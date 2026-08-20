import "server-only";
import { getRepository } from "@/lib/server/repositories";
import { listHqTenants } from "@/lib/server/hq-repo";
import type { AgentId } from "@/lib/ai/agents";
import {
  demandHint,
  periodSales,
  slowMovers,
  topProducts,
} from "@/lib/server/ai-insights";

const daysProp = {
  type: "number",
  description: "Lookback days (1–90). Default 7 for sales, 30 for products.",
};

export const OWNER_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "inventory_stats",
      description: "Counts products, stock value, and low-stock items for this shop.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "sales_summary",
      description: "Today and all-time completed sale counts and revenue.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "period_sales",
      description:
        "Completed sales count and revenue for a period, split by POS / ONLINE_STORE / WHATSAPP.",
      parameters: {
        type: "object",
        properties: {
          days: daysProp,
          source: {
            type: "string",
            description: "Optional channel: POS, ONLINE_STORE, WHATSAPP, PHONE, OTHER",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "top_products",
      description: "Best-selling products by quantity from sale lines.",
      parameters: {
        type: "object",
        properties: { days: daysProp, limit: { type: "number" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "slow_movers",
      description: "In-stock products with no sales in the lookback window.",
      parameters: { type: "object", properties: { days: daysProp } },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "demand_hint",
      description:
        "Naive next-7-day revenue hint from the last 28 days. Label as estimate only.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "low_stock_sample",
      description: "Up to 15 products at or below quantity 5.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export const HQ_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "tenant_health",
      description: "Fleet tenant count, expired licences, and per-shop sales totals.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "quiet_shops",
      description: "Tenants with zero recorded sales_count — likely empty or inactive.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "backup_hint",
      description: "Where HQ downloads full JSON backups and PITR lives.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export function toolsFor(agent: AgentId) {
  return agent === "hq-ops" ? HQ_TOOLS : OWNER_TOOLS;
}

export async function runTool(
  name: string,
  plane: "hq" | "owner",
  rawArgs?: string,
): Promise<string> {
  let args: Record<string, unknown> = {};
  if (rawArgs) {
    try {
      args = JSON.parse(rawArgs) as Record<string, unknown>;
    } catch {
      args = {};
    }
  }
  const days = Number(args.days) || undefined;
  const source = typeof args.source === "string" ? args.source : undefined;
  const limit = Number(args.limit) || undefined;

  if (plane === "hq") {
    if (name === "tenant_health") {
      const { tenants, source: src, serviceRole } = await listHqTenants();
      return JSON.stringify({
        source: src,
        serviceRole,
        tenantCount: tenants.length,
        expired: tenants.filter((t) => t.status === "expired").length,
        expiring: tenants.filter((t) => t.status === "expiring").length,
        names: tenants.slice(0, 20).map((t) => ({
          name: t.name,
          plan: t.plan,
          status: t.status,
          salesCount: t.salesCount,
          salesTotal: t.salesTotal,
        })),
      });
    }
    if (name === "quiet_shops") {
      const { tenants } = await listHqTenants();
      const quiet = tenants
        .filter((t) => Number(t.salesCount) === 0)
        .map((t) => ({ name: t.name, plan: t.plan, status: t.status }));
      return JSON.stringify({ quiet, count: quiet.length });
    }
    if (name === "backup_hint") {
      return JSON.stringify({
        hqJson: "/hq/backups and GET /api/hq/backup",
        tenantJson: "GET /api/backup",
        pitr: "Supabase dashboard for project veavfkjgtkbnggukzjds",
        secrets: "Tokens and API keys are redacted in JSON exports",
      });
    }
    return JSON.stringify({ error: "Unknown HQ tool" });
  }

  const repo = await getRepository();
  if (name === "inventory_stats") {
    return JSON.stringify(await repo.inventoryStats());
  }
  if (name === "sales_summary") {
    return JSON.stringify(await repo.salesStats());
  }
  if (name === "period_sales") {
    return JSON.stringify(await periodSales(days ?? 7, source));
  }
  if (name === "top_products") {
    return JSON.stringify(await topProducts(days ?? 30, limit ?? 10));
  }
  if (name === "slow_movers") {
    return JSON.stringify(await slowMovers(days ?? 30, limit ?? 15));
  }
  if (name === "demand_hint") {
    return JSON.stringify(await demandHint());
  }
  if (name === "low_stock_sample") {
    const page = await repo.queryProducts({ pageSize: 200 });
    const low = page.items
      .filter((p) => p.quantity <= 5)
      .slice(0, 15)
      .map((p) => ({ name: p.name, quantity: p.quantity, category: p.category }));
    return JSON.stringify({
      low,
      note: page.total === 0 ? "Catalogue is empty — import products first." : undefined,
    });
  }
  return JSON.stringify({ error: "Unknown owner tool" });
}
