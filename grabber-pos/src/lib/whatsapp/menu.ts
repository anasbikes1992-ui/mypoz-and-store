import { t, type Locale } from "./i18n";

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

export function greetingMenu(orgName: string, locale: Locale = "en"): string {
  return [
    `${t(locale, "welcome")} ${orgName}.`,
    "",
    `1. ${t(locale, "order")}`,
    `2. ${t(locale, "viewMenu")}`,
    `3. ${t(locale, "offers")}`,
    `4. ${t(locale, "location")}`,
    `5. ${t(locale, "trackOrder")}`,
    `6. ${t(locale, "talkToStaff")}`,
    "",
    t(locale, "replyNumber"),
  ].join("\n");
}

function money(amount: number): string {
  return `Rs ${amount.toFixed(2)}`;
}

function formatMenu(categories: BotCatalogCategory[], locale: Locale): string {
  const lines = categories.flatMap((c) => [
    `*${c.name}*`,
    ...c.products.slice(0, 8).map((p) => `• ${p.name} — ${money(p.salePrice)}`),
  ]);
  return lines.join("\n") || t(locale, "menuSoon");
}

function categoryList(categories: BotCatalogCategory[], locale: Locale): string {
  if (!categories.length) return t(locale, "noCategories");
  return categories.map((c, i) => `${i + 1}. ${c.name}`).join("\n");
}

export function nextBotTurn(input: BotTurnInput): BotTurnResult {
  const text = input.text.trim();
  const locale: Locale = input.locale ?? input.payload.locale ?? "en";
  const payload: BotPayload = {
    cart: [...(input.payload.cart ?? [])],
    categoryName: input.payload.categoryName,
    locale,
  };
  const greet = greetingMenu(input.orgName, locale);
  const isHi = /^(hi|hello|hey|menu|start|en|si|ta|english|sinhala|tamil)$/i.test(text);
  const isChoice = /^[1-6]$/.test(text);

  if (isHi) {
    return {
      reply: greet,
      nextState: "GREETING",
      nextPayload: { cart: payload.cart, locale },
      action: "none",
    };
  }

  if (input.state === "GREETING" || input.state === "MENU") {
    if (!isChoice && input.state === "GREETING" && !/order|menu|offer|location|track|staff/i.test(text)) {
      return {
        reply: greet,
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    }

    if (text === "1" || /order/i.test(text)) {
      return {
        reply: `${t(locale, "chooseCategory")}\n\n${categoryList(input.categories, locale)}`,
        nextState: "ORDERING",
        nextPayload: { cart: payload.cart, locale },
        action: "none",
      };
    }
    if (text === "2" || /menu/i.test(text)) {
      return {
        reply: formatMenu(input.categories, locale),
        nextState: "MENU",
        nextPayload: payload,
        action: "none",
      };
    }
    if (text === "3" || /offer/i.test(text)) {
      return {
        reply: input.offersText || t(locale, "noOffers"),
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    }
    if (text === "4" || /location|address/i.test(text)) {
      return {
        reply: input.locationText || t(locale, "locationUnset"),
        nextState: "GREETING",
        nextPayload: payload,
        action: "none",
      };
    }
    if (text === "5" || /track/i.test(text)) {
      return {
        reply: t(locale, "sendReceipt"),
        nextState: "TRACK",
        nextPayload: payload,
        action: "none",
      };
    }
    if (text === "6" || /staff|human/i.test(text)) {
      return {
        reply: t(locale, "staffSoon"),
        nextState: "STAFF",
        nextPayload: payload,
        action: "staff",
      };
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
          .map((p, i) => `${i + 1}. ${p.name} — ${money(p.salePrice)}`)
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
