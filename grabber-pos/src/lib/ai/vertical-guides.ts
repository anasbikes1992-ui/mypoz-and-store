/**
 * Sale-mode vertical map for Jarvis — routes + how Jarvis helps (no live metrics).
 */

export interface VerticalGuide {
  key: string;
  title: string;
  href: string;
  audience: "owner" | "both";
  jarvis: string;
  tags: string[];
}

export const VERTICAL_GUIDES: VerticalGuide[] = [
  {
    key: "retail",
    title: "Retail POS",
    href: "/pos",
    audience: "owner",
    jarvis:
      "Live tools: period_sales, top_products, slow_movers, inventory, demand_hint. Ask sales today / low stock.",
    tags: ["retail", "pos", "barcode", "sell"],
  },
  {
    key: "wholesale",
    title: "Wholesale",
    href: "/pos?mode=wholesale",
    audience: "owner",
    jarvis:
      "KB: tiers VIP/MOQ/credit. Tools still use shop sales/stock — set customer priceTier on Customers.",
    tags: ["wholesale", "moq", "vip", "tier"],
  },
  {
    key: "category",
    title: "Category sale",
    href: "/pos?mode=category",
    audience: "owner",
    jarvis: "Same POS cart without barcode-first UX. Use sales tools like retail.",
    tags: ["category", "grid", "cafe"],
  },
  {
    key: "restaurant",
    title: "Restaurant",
    href: "/restaurant",
    audience: "owner",
    jarvis:
      "KB: floor by area, KOT/BOT, pay-by-seat. No live table-open tool yet — open /restaurant + /kds.",
    tags: ["restaurant", "kot", "bot", "table", "seat", "kds"],
  },
  {
    key: "delivery",
    title: "Delivery hub",
    href: "/delivery",
    audience: "owner",
    jarvis:
      "KB: status filters + driver loads. Storefront COD settles without double stock. Open /delivery /drivers.",
    tags: ["delivery", "driver", "courier", "cod"],
  },
  {
    key: "repair",
    title: "Repair",
    href: "/repair",
    audience: "owner",
    jarvis: "KB: SLA due dates, status filters, WhatsApp status copy. Alerts show overdue jobs.",
    tags: ["repair", "job", "sla", "parts", "labour"],
  },
  {
    key: "service",
    title: "Vehicle service",
    href: "/service",
    audience: "owner",
    jarvis: "Same job engine as repair with vehicle subject label. Use /service.",
    tags: ["service", "vehicle", "garage", "labour"],
  },
  {
    key: "reloads",
    title: "Mobile reloads",
    href: "/reloads",
    audience: "owner",
    jarvis: "KB: providers from Settings. Sales land on the normal ledger — no carrier API.",
    tags: ["reloads", "topup", "dialog", "mobitel"],
  },
  {
    key: "rooms",
    title: "Rooms",
    href: "/rooms",
    audience: "owner",
    jarvis: "KB: units, occupancy, folio, housekeeping. No live occupancy tool yet — use /rooms.",
    tags: ["rooms", "hotel", "folio", "housekeeping"],
  },
  {
    key: "rent",
    title: "Rent",
    href: "/rent",
    audience: "owner",
    jarvis: "Same booking engine as rooms with rent labels. Use /rent.",
    tags: ["rent", "rental", "deposit", "asset"],
  },
  {
    key: "hire",
    title: "Hire purchase",
    href: "/hire-purchase",
    audience: "owner",
    jarvis: "KB: due day + overdue on Alerts. No live HP balance tool — open /hire-purchase.",
    tags: ["hire", "purchase", "installment", "overdue"],
  },
  {
    key: "play",
    title: "Play area",
    href: "/play",
    audience: "owner",
    jarvis: "KB: zones + capacity in Settings. Check-in blocked at capacity.",
    tags: ["play", "zone", "capacity", "kids"],
  },
  {
    key: "layaway",
    title: "Layaway",
    href: "/layaway",
    audience: "owner",
    jarvis: "Deposits & holds module. Ask kb_search layaway for steps; settle via module UI.",
    tags: ["layaway", "deposit", "hold"],
  },
  {
    key: "click-collect",
    title: "Click & collect",
    href: "/click-collect",
    audience: "owner",
    jarvis: "Pick list for web/POS holds. Online orders also under /commerce/orders.",
    tags: ["click", "collect", "pickup", "pick"],
  },
  {
    key: "digital",
    title: "Digital goods",
    href: "/digital",
    audience: "owner",
    jarvis: "Non-inventory lines + WA/email delivery stub. Sales still via create_sale path.",
    tags: ["digital", "download", "code"],
  },
];

export function listVerticalGuides(query?: string): {
  verticals: Array<Pick<VerticalGuide, "key" | "title" | "href" | "jarvis">>;
  note: string;
} {
  const q = (query ?? "").trim().toLowerCase();
  const tokens = q
    ? q.split(/[^a-z0-9]+/i).filter((t) => t.length >= 2)
    : [];
  let rows = VERTICAL_GUIDES;
  if (tokens.length) {
    rows = VERTICAL_GUIDES.filter((v) => {
      const hay = `${v.key} ${v.title} ${v.tags.join(" ")} ${v.jarvis}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    });
  }
  return {
    verticals: rows.map((v) => ({
      key: v.key,
      title: v.title,
      href: v.href,
      jarvis: v.jarvis,
    })),
    note:
      "Jarvis has live sales/stock tools for retail-like modes; other verticals are guided via kb_search + this map until dedicated metrics tools ship. HQ uses fleet_pulse / tenant_monitor across all tenants.",
  };
}
