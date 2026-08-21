import { t, type Locale } from "./i18n";
import {
  greetingMenuFromGraph,
  normalizeEnabledPaths,
  pathFromKeyword,
  resolveMenuChoice,
  type AutomationGraphConfig,
  type AutomationPathEnabled,
  type AutomationPathId,
} from "./automation-graph";

export type BotState = "GREETING" | "MENU" | "ORDERING" | "TRACK" | "STAFF";

export interface BotCartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface BotPayload {
  cart: BotCartItem[];
  categoryName?: string;
  locale?: Locale;
}

export interface BotCatalogProduct {
  id: string;
  name: string;
  salePrice: number;
  stock?: number;
}

export interface BotCatalogCategory {
  name: string;
  products: BotCatalogProduct[];
}

export interface BotTurnInput {
  state: BotState;
  payload: BotPayload;
  text: string;
  orgName: string;
  categories: BotCatalogCategory[];
  locationText: string;
  offersText: string;
  /** Optional welcome line under the store name. */
  greeting?: string;
  enabledPaths?: Partial<AutomationPathEnabled> | null;
  locale?: Locale;
}

export type BotAction = "none" | "checkout" | "track" | "staff";

export interface BotTurnResult {
  reply: string;
  nextState: BotState;
  nextPayload: BotPayload;
  action: BotAction;
  trackQuery?: string;
}

export function emptyBotPayload(): BotPayload {
  return { cart: [] };
}

export function greetingMenu(
  orgName: string,
  locale: Locale = "en",
  config?: Partial<Pick<AutomationGraphConfig, "greeting" | "enabled">>,
): string {
  return greetingMenuFromGraph(orgName, locale, {
    greeting: config?.greeting ?? "",
    enabled: normalizeEnabledPaths(config?.enabled),
  });
}

function money(amount: number): string {
  return `Rs ${amount.toFixed(2)}`;
}

function formatProductLine(p: BotCatalogProduct, locale: Locale): string {
  const price = money(p.salePrice);
  if (typeof p.stock === "number" && p.stock <= 0) {
    return `• ${p.name} — ${price} — ${t(locale, "outOfStock")}`;
  }
  if (typeof p.stock === "number") {
    return `• ${p.name} — ${price} — ${p.stock} ${t(locale, "left")}`;
  }
  return `• ${p.name} — ${price}`;
}

function formatMenu(categories: BotCatalogCategory[], locale: Locale): string {
  const lines = categories.flatMap((c) => [
    `*${c.name}*`,
    ...c.products.slice(0, 20).map((p) => formatProductLine(p, locale)),
  ]);
  return lines.join("\n") || t(locale, "menuSoon");
}

function categoryList(categories: BotCatalogCategory[], locale: Locale): string {
  if (!categories.length) return t(locale, "noCategories");
  return categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
}

function startPath(
  path: AutomationPathId,
  input: BotTurnInput,
  locale: Locale,
  payload: BotPayload,
): BotTurnResult {
  switch (path) {
    case "order":
      return {
        reply: `${t(locale, "chooseCategory")}\n\n${categoryList(input.categories, locale)}`,
        nextState: "ORDERING",
        nextPayload: { cart: payload.cart, locale },
        action: "none",
      };
    case "menu":
      return {
        reply: formatMenu(input.categories, locale),
        nextState: "MENU",
        nextPayload: payload,
        action: "none",
      };
    case "offers":
      return {
        reply: input.offersText || t(locale, "noOffers"),
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    case "location":
      return {
        reply: input.locationText || t(locale, "locationUnset"),
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    case "track":
      return {
        reply: t(locale, "sendReceipt"),
        nextState: "TRACK",
        nextPayload: payload,
        action: "none",
      };
    case "staff":
      return {
        reply: t(locale, "staffSoon"),
        nextState: "STAFF",
        nextPayload: payload,
        action: "staff",
      };
  }
}

export function nextBotTurn(input: BotTurnInput): BotTurnResult {
  const text = input.text.trim();
  const locale: Locale = input.locale ?? input.payload.locale ?? "en";
  const payload: BotPayload = {
    cart: [...(input.payload.cart ?? [])],
    categoryName: input.payload.categoryName,
    locale,
  };
  const enabled = normalizeEnabledPaths(input.enabledPaths);
  const greet = greetingMenu(input.orgName, locale, {
    greeting: input.greeting,
    enabled,
  });
  const isHi = /^(hi|hello|hey|menu|start|en|si|ta|english|sinhala|tamil)$/i.test(text);
  const numbered = resolveMenuChoice(text, enabled);
  const keywordPath = pathFromKeyword(text);

  if (isHi) {
    return {
      reply: greet,
      nextState: "GREETING",
      nextPayload: { cart: payload.cart, locale },
      action: "none",
    };
  }

  if (input.state === "GREETING" || input.state === "MENU") {
    const path = numbered ?? keywordPath;
    if (!path && input.state === "GREETING") {
      return {
        reply: greet,
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    }
    if (path) {
      if (!enabled[path]) {
        return {
          reply: greet,
          nextState: "GREETING",
          nextPayload: payload,
          action: "none",
        };
      }
      return startPath(path, input, locale, payload);
    }
  }

  if (input.state === "ORDERING") {
    if (text === "0") {
      if (!payload.cart.length) {
        return {
          reply: t(locale, "cartEmpty"),
          nextState: "ORDERING",
          nextPayload: payload,
          action: "none",
        };
      }
      return {
        reply: t(locale, "placing"),
        nextState: "GREETING",
        nextPayload: { cart: payload.cart, locale },
        action: "checkout",
      };
    }

    if (!payload.categoryName) {
      const catIndex = Number(text) - 1;
      const cat = input.categories[catIndex];
      if (cat) {
        const items = cat.products
          .map((p, i) => `${i + 1}. ${formatProductLine(p, locale).replace(/^• /, "")}`)
          .join("\n");
        return {
          reply: `${t(locale, "selectItem")}\n\n${items}\n\n${t(locale, "sendZero")}`,
          nextState: "ORDERING",
          nextPayload: { cart: payload.cart, categoryName: cat.name, locale },
          action: "none",
        };
      }
      return {
        reply: `${t(locale, "listedCategory")}\n\n${categoryList(input.categories, locale)}`,
        nextState: "ORDERING",
        nextPayload: payload,
        action: "none",
      };
    }

    const cat = input.categories.find((c) => c.name === payload.categoryName);
    const product = cat?.products[Number(text) - 1];
    if (product) {
      if (typeof product.stock === "number" && product.stock <= 0) {
        return {
          reply: t(locale, "outOfStock"),
          nextState: "ORDERING",
          nextPayload: payload,
          action: "none",
        };
      }
      const cart = [...payload.cart];
      const existing = cart.find((c) => c.productId === product.id);
      if (existing) existing.quantity += 1;
      else {
        cart.push({
          productId: product.id,
          name: product.name,
          unitPrice: product.salePrice,
          quantity: 1,
        });
      }
      return {
        reply: `${t(locale, "added")} ${product.name}. ${t(locale, "sendAnother")}`,
        nextState: "ORDERING",
        nextPayload: { cart, categoryName: payload.categoryName, locale },
        action: "none",
      };
    }
    return {
      reply: t(locale, "listedNumber"),
      nextState: "ORDERING",
      nextPayload: payload,
      action: "none",
    };
  }

  if (input.state === "TRACK") {
    return {
      reply: t(locale, "lookingUp"),
      nextState: "GREETING",
      nextPayload: payload,
      action: "track",
      trackQuery: text.toUpperCase(),
    };
  }

  if (input.state === "STAFF") {
    return {
      reply: t(locale, "staffThanks"),
      nextState: "STAFF",
      nextPayload: payload,
      action: "staff",
    };
  }

  return {
    reply: greet,
    nextState: "GREETING",
    nextPayload: payload,
    action: "none",
  };
}
