import "server-only";
import { getRepository } from "@/lib/server/repositories";
import {
  getHqSummary,
  getHqTenant,
  listHqTenants,
  listHqTickets,
} from "@/lib/server/hq-repo";
import {
  getHqFleetPulse,
  getHqTenantMonitor,
} from "@/lib/server/hq-monitor";
import type { AgentId } from "@/lib/ai/agents";
import { searchKb } from "@/lib/ai/kb";
import { listVerticalGuides } from "@/lib/ai/vertical-guides";
import {
  searchTenantKb,
  tenantKnowledgeAllowed,
} from "@/lib/server/tenant-kb-store";
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

/** Shared how-to knowledge (curated docs snippets). */
const KB_SEARCH_TOOL = {
  type: "function" as const,
  function: {
    name: "kb_search",
    description:
      "Search MyPoz platform knowledge plus this shop’s custom knowledge base (Business+). Use before inventing procedures.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Short topic, e.g. whatsapp webhook, wholesale MOQ, fleet backup",
        },
        limit: {
          type: "number",
          description: "Max hits 1–5 (default 3)",
        },
      },
      required: ["query"],
    },
  },
};

const LIST_VERTICALS_TOOL = {
  type: "function" as const,
  function: {
    name: "list_verticals",
    description:
      "Map sale-mode verticals to app routes and what Jarvis can do for each (retail, restaurant, delivery, rooms, repair, etc.). Optional query filters.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional filter, e.g. restaurant, delivery, hire",
        },
      },
    },
  },
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
  KB_SEARCH_TOOL,
  LIST_VERTICALS_TOOL,
];

export const HQ_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "fleet_pulse",
      description:
        "Command-center rollup: tenant count, sales total, quiet shops, low-stock orgs, WA attached, live storefronts, open tickets.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "tenant_health",
      description: "Fleet tenant list with plan, status, sales counts/totals.",
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
      name: "tenant_monitor",
      description:
        "God's-view for one org: 7d/30d sales, stock health, branches, users, storefront, WhatsApp flags, open online orders.",
      parameters: {
        type: "object",
        properties: {
          orgId: {
            type: "string",
            description: "Organization UUID from tenant_health",
          },
          nameHint: {
            type: "string",
            description: "Optional shop name substring if orgId unknown",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_tickets",
      description: "Open (non-resolved) HQ support tickets.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "whatsapp_fleet_hint",
      description:
        "How WhatsApp Cloud API is wired for the fleet (env + per-org attach). Does not reveal secrets.",
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
  KB_SEARCH_TOOL,
  LIST_VERTICALS_TOOL,
];

export function toolsFor(agent: AgentId) {
  return agent === "hq-ops" ? HQ_TOOLS : OWNER_TOOLS;
}

async function resolveOrgId(args: Record<string, unknown>): Promise<string | null> {
  const orgId = typeof args.orgId === "string" ? args.orgId.trim() : "";
  if (orgId) return orgId;
  const hint =
    typeof args.nameHint === "string" ? args.nameHint.trim().toLowerCase() : "";
  if (!hint) return null;
  const { tenants } = await listHqTenants();
  const hit = tenants.find((t) => t.name.toLowerCase().includes(hint));
  return hit?.id ?? null;
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

  if (name === "kb_search") {
    const query = typeof args.query === "string" ? args.query : "";
    const limit = Number(args.limit) || 3;
    const platform = searchKb(query, {
      audience: plane === "hq" ? "hq" : "owner",
      limit,
    });
    let tenantHits: Awaited<ReturnType<typeof searchTenantKb>> = [];
    let tenantNote: string | undefined;
    let tenantKbEnabled = false;
    if (plane === "owner") {
      tenantKbEnabled = await tenantKnowledgeAllowed();
      if (tenantKbEnabled) {
        tenantHits = await searchTenantKb(query, limit);
      } else {
        tenantNote =
          "Shop custom KB locked — upgrade to Business/Enterprise or ask HQ for extras: knowledge.";
      }
    }
    const hits = [
      ...tenantHits.map((h) => ({
        id: h.id,
        title: h.title,
        source: h.source,
        score: h.score + 0.5,
        body: h.body,
        origin: h.origin,
      })),
      ...platform.hits.map((h) => ({ ...h, origin: "platform" as const })),
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(limit, 5));
    return JSON.stringify({
      query,
      hits,
      note: platform.note || tenantNote,
      tenantKbEnabled,
    });
  }
  if (name === "list_verticals") {
    const query = typeof args.query === "string" ? args.query : undefined;
    return JSON.stringify(listVerticalGuides(query));
  }

  if (plane === "hq") {
    if (name === "fleet_pulse") {
      const [summary, pulse] = await Promise.all([
        getHqSummary(),
        getHqFleetPulse(),
      ]);
      return JSON.stringify({
        summary: {
          tenantCount: summary.tenantCount,
          salesTotal: summary.salesTotal,
          expiredCount: summary.expiredCount,
          expiringCount: summary.expiringCount,
          openTickets: summary.openTickets,
          source: summary.source,
          serviceRole: summary.serviceRole,
        },
        pulse: {
          quietShopCount: pulse.quietShopCount,
          lowStockOrgs: pulse.lowStockOrgs,
          waAttachedCount: pulse.waAttachedCount,
          storefrontLiveCount: pulse.storefrontLiveCount,
        },
      });
    }
    if (name === "tenant_health") {
      const { tenants, source: src, serviceRole } = await listHqTenants();
      return JSON.stringify({
        source: src,
        serviceRole,
        tenantCount: tenants.length,
        expired: tenants.filter((t) => t.status === "expired").length,
        expiring: tenants.filter((t) => t.status === "expiring").length,
        names: tenants.slice(0, 20).map((t) => ({
          id: t.id,
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
        .map((t) => ({
          id: t.id,
          name: t.name,
          plan: t.plan,
          status: t.status,
        }));
      return JSON.stringify({ quiet, count: quiet.length });
    }
    if (name === "tenant_monitor") {
      const orgId = await resolveOrgId(args);
      if (!orgId) {
        return JSON.stringify({
          error: "Provide orgId or nameHint matching a tenant",
        });
      }
      const [tenant, monitor] = await Promise.all([
        getHqTenant(orgId),
        getHqTenantMonitor(orgId),
      ]);
      return JSON.stringify({
        tenant: tenant
          ? {
              id: tenant.id,
              name: tenant.name,
              plan: tenant.plan,
              status: tenant.status,
              expiry: tenant.expiry,
            }
          : null,
        monitor: {
          slug: monitor.slug,
          period: monitor.period,
          stock: monitor.stock,
          branchCount: monitor.branches.length,
          userCount: monitor.users.length,
          storefront: monitor.storefront,
          whatsapp: monitor.whatsapp,
          openOnlineOrders: monitor.openOnlineOrders,
          quiet: monitor.quiet,
        },
      });
    }
    if (name === "open_tickets") {
      const tickets = await listHqTickets();
      const open = tickets
        .filter((t) => t.status !== "resolved")
        .slice(0, 25)
        .map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          tenantId: t.tenantId,
        }));
      return JSON.stringify({ open, count: open.length });
    }
    if (name === "whatsapp_fleet_hint") {
      const pulse = await getHqFleetPulse();
      return JSON.stringify({
        waAttachedCount: pulse.waAttachedCount,
        envNeeded: [
          "WHATSAPP_TOKEN",
          "WHATSAPP_PHONE_NUMBER_ID",
          "WHATSAPP_VERIFY_TOKEN",
          "WHATSAPP_APP_SECRET",
        ],
        webhook: "/api/whatsapp/webhook",
        hqUi: "/hq/whatsapp",
        note: "Use Meta app that already has WhatsApp product (GRABBER). Development mode limits senders to test numbers until Live + Business verification.",
      });
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
