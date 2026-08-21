import { t, type Locale } from "./i18n";

/** Client-facing automation paths (menu branches from Greeting). */
export type AutomationPathId =
  | "order"
  | "menu"
  | "offers"
  | "location"
  | "track"
  | "staff";

export type AutomationNodeKind =
  | "trigger"
  | "menu"
  | "catalog"
  | "reply"
  | "action"
  | "handoff"
  | "ledger";

export interface AutomationPathEnabled {
  order: boolean;
  menu: boolean;
  offers: boolean;
  location: boolean;
  track: boolean;
  staff: boolean;
}

export interface AutomationGraphConfig {
  /** Extra line under the welcome (shop slogan / hours). */
  greeting: string;
  enabled: AutomationPathEnabled;
  locationText: string;
  offersText: string;
  /** When true, staff handoff flags the inbox for assignment. */
  staffNotify: boolean;
}

export interface AutomationNode {
  id: string;
  kind: AutomationNodeKind;
  title: string;
  description: string;
  /** Settings field this node edits, if any. */
  editKey?: "greeting" | "offersText" | "locationText" | "staffNotify" | "enabled";
  pathId?: AutomationPathId;
}

export interface AutomationEdge {
  from: string;
  to: string;
  label: string;
}

export const DEFAULT_ENABLED_PATHS: AutomationPathEnabled = {
  order: true,
  menu: true,
  offers: true,
  location: true,
  track: true,
  staff: true,
};

const PATH_ORDER: AutomationPathId[] = [
  "order",
  "menu",
  "offers",
  "location",
  "track",
  "staff",
];

const PATH_I18N: Record<
  AutomationPathId,
  "order" | "viewMenu" | "offers" | "location" | "trackOrder" | "talkToStaff"
> = {
  order: "order",
  menu: "viewMenu",
  offers: "offers",
  location: "location",
  track: "trackOrder",
  staff: "talkToStaff",
};

export function normalizeEnabledPaths(
  raw?: Partial<AutomationPathEnabled> | null,
): AutomationPathEnabled {
  return {
    order: raw?.order !== false,
    menu: raw?.menu !== false,
    offers: raw?.offers !== false,
    location: raw?.location !== false,
    track: raw?.track !== false,
    staff: raw?.staff !== false,
  };
}

export function enabledPathList(
  enabled: AutomationPathEnabled,
): AutomationPathId[] {
  return PATH_ORDER.filter((id) => enabled[id]);
}

/** Map customer reply "1".."N" to a path using current enabled set. */
export function resolveMenuChoice(
  text: string,
  enabled: AutomationPathEnabled,
): AutomationPathId | null {
  const n = Number(text.trim());
  if (!Number.isInteger(n) || n < 1) return null;
  const list = enabledPathList(enabled);
  return list[n - 1] ?? null;
}

export function pathFromKeyword(text: string): AutomationPathId | null {
  if (/order/i.test(text)) return "order";
  if (/menu/i.test(text)) return "menu";
  if (/offer/i.test(text)) return "offers";
  if (/location|address/i.test(text)) return "location";
  if (/track/i.test(text)) return "track";
  if (/staff|human/i.test(text)) return "staff";
  return null;
}

export function greetingMenuFromGraph(
  orgName: string,
  locale: Locale,
  config: Pick<AutomationGraphConfig, "greeting" | "enabled">,
): string {
  const lines = [`${t(locale, "welcome")} ${orgName}.`];
  const extra = config.greeting.trim();
  if (extra) {
    lines.push(extra);
  }
  lines.push("");
  const paths = enabledPathList(config.enabled);
  if (!paths.length) {
    lines.push(t(locale, "talkToStaff"));
    lines.push("");
    lines.push(t(locale, "replyNumber"));
    return lines.join("\n");
  }
  paths.forEach((id, i) => {
    lines.push(`${i + 1}. ${t(locale, PATH_I18N[id])}`);
  });
  lines.push("");
  lines.push(t(locale, "replyNumber"));
  return lines.join("\n");
}

/** Static graph for the client UI (structure never changes; status does). */
export function automationGraphBlueprint(): {
  nodes: AutomationNode[];
  edges: AutomationEdge[];
} {
  return {
    nodes: [
      {
        id: "hi",
        kind: "trigger",
        title: "Customer says hi",
        description: "hi · hello · menu · start · en/si/ta",
      },
      {
        id: "greeting",
        kind: "menu",
        title: "Greeting menu",
        description: "Welcome + numbered choices",
        editKey: "greeting",
      },
      {
        id: "order",
        kind: "catalog",
        title: "1 · Order",
        description: "Live POS categories → cart → COD sale",
        pathId: "order",
        editKey: "enabled",
      },
      {
        id: "menu",
        kind: "catalog",
        title: "2 · View menu",
        description: "Browse live stock (read-only)",
        pathId: "menu",
        editKey: "enabled",
      },
      {
        id: "offers",
        kind: "reply",
        title: "3 · Offers",
        description: "Your promo text reply",
        pathId: "offers",
        editKey: "offersText",
      },
      {
        id: "location",
        kind: "reply",
        title: "4 · Location",
        description: "Address / map / hours reply",
        pathId: "location",
        editKey: "locationText",
      },
      {
        id: "track",
        kind: "action",
        title: "5 · Track order",
        description: "Lookup by receipt in the same ledger",
        pathId: "track",
        editKey: "enabled",
      },
      {
        id: "staff",
        kind: "handoff",
        title: "6 · Talk to staff",
        description: "Flags inbox for human reply",
        pathId: "staff",
        editKey: "staffNotify",
      },
      {
        id: "checkout",
        kind: "ledger",
        title: "Checkout → POS sale",
        description: "source = WHATSAPP · unpaid COD",
      },
      {
        id: "inbox",
        kind: "handoff",
        title: "Merchant inbox",
        description: "Assign staff · reply in WhatsApp Business",
      },
    ],
    edges: [
      { from: "hi", to: "greeting", label: "start" },
      { from: "greeting", to: "order", label: "path" },
      { from: "greeting", to: "menu", label: "path" },
      { from: "greeting", to: "offers", label: "path" },
      { from: "greeting", to: "location", label: "path" },
      { from: "greeting", to: "track", label: "path" },
      { from: "greeting", to: "staff", label: "path" },
      { from: "order", to: "checkout", label: "send 0" },
      { from: "staff", to: "inbox", label: "handoff" },
    ],
  };
}

export function pathReadyStatus(
  pathId: AutomationPathId,
  config: AutomationGraphConfig,
): "ready" | "needs_setup" | "off" {
  if (!config.enabled[pathId]) return "off";
  if (pathId === "offers" && !config.offersText.trim()) return "needs_setup";
  if (pathId === "location" && !config.locationText.trim()) return "needs_setup";
  return "ready";
}
