/**
 * Curated MyPoz knowledge snippets for Jarvis kb_search (no filesystem I/O).
 * Keep entries short; source paths are for humans / HQ docs hub.
 */

export type KbAudience = "hq" | "owner" | "both";

export interface KbSection {
  id: string;
  title: string;
  audience: KbAudience;
  tags: string[];
  source: string;
  body: string;
}

export const JARVIS_KB: KbSection[] = [
  {
    id: "whatsapp-attach",
    title: "WhatsApp Cloud API attach",
    audience: "both",
    tags: ["whatsapp", "webhook", "meta", "token", "inbox", "hi"],
    source: "docs/WHATSAPP.md",
    body: `Wire Meta WhatsApp on Vercel (mypoz-and-store-ui): WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET. Webhook URL: /api/whatsapp/webhook. HQ attaches a phone number id per tenant at /hq/whatsapp. Bot menu is numbered text from POS stock — not a Meta product catalog unless separately synced. Development Meta apps only reach allowlisted test numbers until Live + Business verification. Templates stay deferred until Meta Approved. Staff reply from /whatsapp within the 24h customer-care window.`,
  },
  {
    id: "pos-register",
    title: "POS sell and register",
    audience: "owner",
    tags: ["pos", "register", "sale", "retail", "cash", "licence"],
    source: "docs/USER-GUIDE.md",
    body: `Sell on /pos (retail) or /pos?mode=wholesale. Open the cash register at /register before relying on Z-reports. Licence-expired tenants cannot take payment — renew in Admin/Billing. create_sale is the only sale path; never invent a parallel ledger. Hold/recall, split tender, manager PIN on large discount/override are built into the bill panel.`,
  },
  {
    id: "wholesale-tiers",
    title: "Wholesale price tiers and MOQ",
    audience: "owner",
    tags: ["wholesale", "vip", "moq", "tier", "credit"],
    source: "docs/PRODUCT-GAP.md",
    body: `Customers have priceTier retail | wholesale | vip. Products may set wholesalePrice, vipPrice, and minWholesaleQty. On wholesale mode the bill uses the active tier, shows MOQ shortfall warnings, qty presets, and customer credit limit. HQ flag wholesaleEnabled can hide wholesale from the launcher. Configure VIP/MOQ on the product form.`,
  },
  {
    id: "rooms-rent",
    title: "Rooms and rent bookings",
    audience: "owner",
    tags: ["rooms", "rent", "booking", "folio", "housekeeping", "occupancy"],
    source: "docs/FEATURE-PLAN.md",
    body: `/rooms and /rent share the booking engine. Manage units (available/occupied/dirty/out_of_order), occupancy board, date conflict checks, check-in, folio extras (folio/F&B/other), and housekeeping after checkout (rooms marked dirty until cleaned). Not a full PMS or channel manager.`,
  },
  {
    id: "hq-fleet",
    title: "HQ fleet ops",
    audience: "hq",
    tags: ["hq", "tenant", "licence", "gms", "onboard", "jarvis"],
    source: "docs/GMS-OPERATIONS.md",
    body: `GMS operators use /hq: command center, tenants, licences, onboard, tickets, WhatsApp attach, backups, Jarvis. Gate with GMS_ADMIN_EMAILS. Password resets are on tenant detail UI — Jarvis must not invent credentials. Fleet pulse and tenant_monitor tools give live counts; quiet shops often mean empty catalogues.`,
  },
  {
    id: "storefront",
    title: "Customer storefront",
    audience: "both",
    tags: ["store", "storefront", "commerce", "cod", "delivery", "website"],
    source: "docs/CUSTOMER-STOREFRONT.md",
    body: `Each tenant can publish /store/[slug] from Website CMS (/website). Orders share POS inventory. Checkout modes include cash/card/bank × pickup/courier (staff confirm; live PickMe/Uber APIs are out of scope). Web orders appear on Click & collect and Delivery boards. Same stock ledger — never a second product database.`,
  },
  {
    id: "repair-alerts",
    title: "Repair SLA, HP overdue, alerts",
    audience: "owner",
    tags: ["repair", "service", "hire", "purchase", "alerts", "play", "reloads"],
    source: "docs/PRODUCT-GAP.md",
    body: `Repair/Service jobs have SLA dueAt (Settings → job SLA days), status filters, and Copy WhatsApp update. Hire purchase shows installment due day and overdue days; Alerts lists stock/expiry plus HP and job overdue. Play area uses zones + max capacity from Settings. Reloads providers come from Settings (comma-separated).`,
  },
  {
    id: "ops-gate",
    title: "Production health and release gate",
    audience: "hq",
    tags: ["health", "deploy", "vercel", "migration", "release", "ops"],
    source: "docs/RELEASE_GATE.md",
    body: `Production host: https://mypoz-and-store-ui.vercel.app. Check GET /api/health (backend supabase, whatsapp true). Run npm run ops:gate from grabber-pos. Auth Site URL must include that host (A-OP-01). Migration 0022 wholesale_tiers adds vip_price and min_wholesale_qty. Do not invent a second Vercel project for live traffic.`,
  },
  {
    id: "restaurant-floor",
    title: "Restaurant floor and split bill",
    audience: "owner",
    tags: ["restaurant", "table", "kot", "bot", "kds", "seat", "split", "course"],
    source: "docs/FEATURE-PLAN.md",
    body: `Open /restaurant — tables group by Area. Tap a table for courses, modifiers, Send Kitchen (KOT) / Send Bar (BOT), kitchen display at /kds. Split by seat shows amounts; Pay seat settles that seat only and leaves the rest open. Manage tables at /tables.`,
  },
  {
    id: "delivery-hub",
    title: "Delivery hub and drivers",
    audience: "owner",
    tags: ["delivery", "driver", "status", "preparing", "out", "cod"],
    source: "docs/FEATURE-PLAN.md",
    body: `/delivery lists orders with status filters (active/new/preparing/out/delivered) and driver load chips. Assign drivers from the order screen; manage fleet at /drivers. Storefront COD: mark delivered/COD collected — stock must not double-decrement. Status advances only forward.`,
  },
  {
    id: "layaway-digital-cc",
    title: "Layaway, digital, click & collect",
    audience: "owner",
    tags: ["layaway", "digital", "click", "collect", "pickup", "deposit"],
    source: "docs/FEATURE-PLAN.md",
    body: `/layaway holds deposits until final sale. /digital sells non-inventory goods with optional WA/email delivery note. /click-collect is the pick list for web/pickup orders (also /commerce/orders). All settle onto the shared sales ledger.`,
  },
  {
    id: "hq-time-savers",
    title: "HQ time-savers with Jarvis",
    audience: "hq",
    tags: ["hq", "time", "fleet", "quiet", "monitor", "tickets", "password"],
    source: "docs/GMS-OPERATIONS.md",
    body: `Use Jarvis tools instead of opening every tenant: fleet_pulse (quiet shops, WA attached, low-stock orgs), tenant_monitor(nameHint), open_tickets, whatsapp_fleet_hint, backup_hint, kb_search, list_verticals. Password reset stays on tenant UI. Quiet shops usually need catalogue import, not a new database.`,
  },
];

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

export function searchKb(
  query: string,
  opts?: { audience?: KbAudience | "any"; limit?: number },
): {
  query: string;
  hits: Array<{
    id: string;
    title: string;
    source: string;
    score: number;
    body: string;
  }>;
  note?: string;
} {
  const audience = opts?.audience ?? "any";
  const limit = Math.min(5, Math.max(1, opts?.limit ?? 3));
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return {
      query,
      hits: [],
      note: "Provide a short topic (e.g. whatsapp webhook, wholesale MOQ).",
    };
  }

  const scored = JARVIS_KB.filter((s) => {
    if (audience === "any") return true;
    return s.audience === "both" || s.audience === audience;
  })
    .map((s) => {
      const hay = `${s.title} ${s.tags.join(" ")} ${s.body}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (s.tags.includes(t)) score += 3;
        if (s.title.toLowerCase().includes(t)) score += 2;
        if (hay.includes(t)) score += 1;
      }
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    query,
    hits: scored.map(({ s, score }) => ({
      id: s.id,
      title: s.title,
      source: s.source,
      score,
      body: s.body,
    })),
    note:
      scored.length === 0
        ? "No KB hit — try different keywords or open /hq/docs / Help."
        : undefined,
  };
}
