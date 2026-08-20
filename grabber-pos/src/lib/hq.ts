import type { PlanTier } from "@/lib/plans";

export type HqTenantStatus =
  | "active"
  | "expired"
  | "expiring"
  | "suspended"
  | "unknown";

export type HqTenantSource =
  | "reseller_licences"
  | "clients"
  | "local_tenant";

export interface HqTenantBrand {
  businessName?: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface HqTenant {
  id: string;
  name: string;
  contact?: string;
  plan: PlanTier | string;
  expiry: string | null;
  onboardedAt: string | null;
  branches: number;
  users: number;
  salesCount: number;
  salesTotal: number;
  brand: HqTenantBrand | null;
  status: HqTenantStatus;
  source: HqTenantSource;
  extras: string[];
}

export interface HqSummary {
  tenantCount: number;
  expiredCount: number;
  expiringCount: number;
  salesTotal: number;
  openTickets: number;
  source: "reseller_licences" | "demo_fallback";
  serviceRole: boolean;
  /** Fleet pulse — cheap cross-org aggregates when service-role is set. */
  quietShopCount?: number;
  lowStockOrgs?: number;
  waAttachedCount?: number;
  storefrontLiveCount?: number;
}

export interface HqTenantMonitor {
  orgId: string;
  slug: string | null;
  onboardedAt: string | null;
  period: {
    sales7d: number;
    sales30d: number;
    revenue7d: number;
    revenue30d: number;
    bySource: { source: string; count: number; total: number }[];
  };
  stock: {
    productCount: number;
    lowStock: number;
    outOfStock: number;
  };
  branches: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    currency: string;
  }[];
  users: {
    id: string;
    fullName: string;
    role: string;
    isActive: boolean;
    email: string | null;
  }[];
  storefront: {
    slug: string | null;
    domain: string | null;
    enabled: boolean;
    status: string | null;
  } | null;
  whatsapp: {
    phoneNumberIdSet: boolean;
    tokenSet: boolean;
    locale: string;
  };
  openOnlineOrders: number;
  quiet: boolean;
}

export interface HqFleetPulse {
  salesTotalLifetime: number;
  quietShopCount: number;
  lowStockOrgs: number;
  waAttachedCount: number;
  storefrontLiveCount: number;
}

export interface HqTicket {
  id: string;
  createdAt: string;
  updatedAt: string;
  subject: string;
  body: string;
  tenantId: string;
  tenantName: string;
  status: "open" | "in_progress" | "resolved";
  priority: "low" | "normal" | "high";
  contact: string;
}

export const HQ_NAV = [
  { href: "/hq", label: "Command center", exact: true },
  { href: "/hq/tenants", label: "Tenants", exact: false },
  { href: "/hq/licences", label: "Licences", exact: false },
  { href: "/hq/onboard", label: "Onboard", exact: false },
  { href: "/hq/tickets", label: "Tickets", exact: false },
  { href: "/hq/whatsapp", label: "WhatsApp", exact: false },
  { href: "/hq/config", label: "Config", exact: false },
  { href: "/hq/backups", label: "Backups", exact: false },
  { href: "/hq/jarvis", label: "Jarvis", exact: false },
  { href: "/hq/docs", label: "Docs", exact: false },
] as const;

/** In-app docs hub entries — paths must match files under docs/. */
export const HQ_DOC_PAGES = [
  {
    slug: "operating-manual",
    title: "Operating manual",
    blurb: "Super admin vs client owner vs staff — HQ, POS, store, WhatsApp.",
    docPath: "docs/MYPOZ_OPERATING_MANUAL.md",
  },
  {
    slug: "hq-playbook",
    title: "HQ playbook",
    blurb: "Daily GMS operator checklist — onboard, monitor, password reset.",
    docPath: "docs/HQ-PLAYBOOK.md",
  },
  {
    slug: "client-playbook",
    title: "Client playbook",
    blurb: "Hand this to shop owners — first day, POS, store, WhatsApp.",
    docPath: "docs/CLIENT-PLAYBOOK.md",
  },
  {
    slug: "whatsapp",
    title: "WhatsApp Cloud API",
    blurb: "Webhook, per-client numbers, bot menu, same sales ledger.",
    docPath: "docs/WHATSAPP.md",
  },
  {
    slug: "customer-storefront",
    title: "Customer storefront",
    blurb: "Tenant storefront do’s and don’ts for shop owners.",
    docPath: "docs/CUSTOMER-STOREFRONT.md",
  },
  {
    slug: "reseller",
    title: "Reseller guide",
    blurb: "Plans, white-label, and client handover.",
    docPath: "docs/RESELLER-GUIDE.md",
  },
  {
    slug: "gms-operations",
    title: "GMS operations",
    blurb: "Monitoring, fixing, guiding tenants — do’s and don’ts for Grabber staff.",
    docPath: "docs/GMS-OPERATIONS.md",
  },
  {
    slug: "production",
    title: "Production cutover",
    blurb: "Env, migrations, and go-live checklist.",
    docPath: "docs/PRODUCTION.md",
  },
  {
    slug: "ddos-waf",
    title: "DDoS and WAF",
    blurb: "Cloudflare in front, Vercel edge, application WAF and IP bans.",
    docPath: "docs/DDOS_AND_WAF.md",
  },
] as const;

export function licenceStatus(
  expiry: string | null | undefined,
  suspended?: boolean,
): HqTenantStatus {
  if (suspended) return "suspended";
  if (!expiry) return "active";
  const t = new Date(expiry).getTime();
  if (Number.isNaN(t)) return "unknown";
  const now = Date.now();
  if (t < now) return "expired";
  const days = (t - now) / (1000 * 60 * 60 * 24);
  if (days <= 14) return "expiring";
  return "active";
}
