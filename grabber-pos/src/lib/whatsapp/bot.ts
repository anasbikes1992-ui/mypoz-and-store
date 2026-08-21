import "server-only";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "@/lib/server/settings-store";
import { holdBill } from "@/lib/server/held-bills-store";
import {
  createWhatsAppSale,
  findWhatsAppSale,
  listWhatsAppCatalog,
  resolveWhatsAppTenant,
} from "@/lib/server/whatsapp-durable";
import {
  appendMessage,
  findMessageByWaId,
  getConversation,
  readWhatsAppSettings,
  upsertConversation,
} from "@/lib/server/whatsapp-inbox-store";
import {
  sendWhatsAppText,
  WhatsAppNotConfiguredError,
} from "@/lib/server/whatsapp";
import { normalizeLkPhone } from "@/lib/whatsapp/phone";
import { detectLocale, isLocale } from "@/lib/whatsapp/i18n";
import {
  emptyBotPayload,
  nextBotTurn,
  type BotCatalogCategory,
} from "@/lib/whatsapp/menu";
import { formatMoney } from "@/lib/format";

async function catalogCategories(
  phoneNumberId?: string,
): Promise<BotCatalogCategory[]> {
  const tenant = await resolveWhatsAppTenant(phoneNumberId);
  if (tenant) {
    try {
      return await listWhatsAppCatalog(tenant);
    } catch {
      // Fall through to session/local catalog.
    }
  }
  const repo = await getRepository();
  const page = await repo.queryProducts({ pageSize: 200 });
  const byCat = new Map<string, BotCatalogCategory>();
  for (const p of page.items) {
    const name = p.category?.trim() || "General";
    const row = byCat.get(name) ?? { name, products: [] };
    row.products.push({
      id: p.id,
      name: p.name,
      salePrice: Number(p.salePrice) || 0,
      stock: Number(p.quantity) || 0,
    });
    byCat.set(name, row);
  }
  return [...byCat.values()];
}

function conversationId(waId: string): string {
  return `WA-${waId.replace(/[^\dA-Za-z]/g, "")}`;
}

export async function handleInboundText(opts: {
  waId: string;
  name?: string;
  text: string;
  waMessageId?: string;
  phoneNumberId?: string;
}): Promise<void> {
  const phoneNumberId =
    opts.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || undefined;
  if (opts.waMessageId) {
    const dup = await findMessageByWaId(opts.waMessageId, phoneNumberId);
    if (dup) return;
  }

  const settings = await readSettings();
  const waSettings = await readWhatsAppSettings(phoneNumberId);
  const orgName = settings.businessName || "MyPoz";
  const locale = detectLocale(
    opts.text,
    waSettings.locale && isLocale(waSettings.locale) ? waSettings.locale : "en",
  );
  const phone =
    normalizeLkPhone(opts.waId) ?? `+${opts.waId.replace(/[^\d]/g, "")}`;
  const id = conversationId(opts.waId);
  const existing = await getConversation(id, phoneNumberId);
  const convo = existing ?? {
    id,
    waId: opts.waId,
    phone,
    name: opts.name,
    state: "GREETING" as const,
    payload: emptyBotPayload(),
    lastMessage: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (opts.waMessageId || opts.text) {
    await appendMessage(
      {
        conversationId: id,
        direction: "in",
        body: opts.text,
        waMessageId: opts.waMessageId,
      },
      phoneNumberId,
    );
  }

  const categories = await catalogCategories(phoneNumberId);
  const turn = nextBotTurn({
    state: convo.state,
    payload: convo.payload,
    text: opts.text,
    orgName,
    categories,
    locationText:
      waSettings.locationText ||
      [settings.address, settings.phone].filter(Boolean).join("\n"),
    offersText: waSettings.offersText,
    greeting: waSettings.greeting,
    enabledPaths: waSettings.enabledPaths,
    locale,
  });

  let reply = turn.reply;
  let lastSaleId = convo.lastSaleId;

  if (turn.action === "checkout") {
    const placed = await placeWhatsAppOrder({
      cart: turn.nextPayload.cart,
      customerName: opts.name || "WhatsApp customer",
      customerMobile: phone,
      phoneNumberId,
    });
    lastSaleId = placed.saleId;
    reply = placed.reply;
    turn.nextPayload = emptyBotPayload();
  } else if (turn.action === "track") {
    reply = await trackWhatsAppOrder(turn.trackQuery ?? "", phoneNumberId);
  }

  await upsertConversation(
    {
      id,
      waId: opts.waId,
      phone,
      name: opts.name || convo.name,
      state: turn.nextState,
      payload: turn.nextPayload,
      lastMessage: reply,
      lastSaleId,
      needsStaffReply:
        waSettings.staffNotify !== false &&
        (turn.action === "staff" || turn.nextState === "STAFF"),
    },
    phoneNumberId,
  );

  await appendMessage(
    {
      conversationId: id,
      direction: "out",
      body: reply,
    },
    phoneNumberId,
  );

  const to = phone.replace(/[^\d]/g, "");
  try {
    await sendWhatsAppText({
      to,
      body: reply,
      phoneNumberId: waSettings.phoneNumberId || undefined,
      token: waSettings.accessToken || undefined,
    });
  } catch (err) {
    if (err instanceof WhatsAppNotConfiguredError) {
      // Demo / inbox-only: conversation is still persisted.
      return;
    }
    throw err;
  }
}

async function placeWhatsAppOrder(opts: {
  cart: { productId: string; name: string; unitPrice: number; quantity: number }[];
  customerName: string;
  customerMobile: string;
  phoneNumberId?: string;
}): Promise<{ saleId?: string; reply: string }> {
  const lines = opts.cart.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    discount: 0,
    name: item.name,
    unitPrice: item.unitPrice,
  }));
  const total = opts.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const summary = opts.cart
    .map((i) => `${i.name} x ${i.quantity}    ${formatMoney(i.unitPrice * i.quantity)}`)
    .join("\n");

  try {
    const tenant = await resolveWhatsAppTenant(opts.phoneNumberId);
    const sale = tenant
      ? await createWhatsAppSale({
          tenant,
          phoneNumberId: opts.phoneNumberId,
          customerName: opts.customerName,
          customerMobile: opts.customerMobile,
          lines: opts.cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        })
      : await (await getRepository()).createSale({
          lines,
          paymentMethod: "cash",
          customerName: opts.customerName,
          customerMobile: opts.customerMobile,
          cashReceived: total,
          status: "completed",
          source: "WHATSAPP",
          channel: "whatsapp",
          fulfillmentStatus: "pending",
          paymentStatus: "unpaid",
          employee: "whatsapp-bot",
        });
    return {
      saleId: sale.id,
      reply: [
        "Order summary",
        "",
        summary,
        "--------------------------------",
        `Total                    ${formatMoney(sale.total)}`,
        "",
        `Order ${sale.id} confirmed (cash on delivery). Same stock as POS.`,
      ].join("\n"),
    };
  } catch {
    const hold = await holdBill({
      label: `WhatsApp ${opts.customerName}`,
      isWholesale: false,
      serviceCharge: 0,
      finalDiscount: 0,
      customerName: opts.customerName,
      customerMobile: opts.customerMobile,
      employee: "whatsapp-bot",
      customerId: null,
      customerPoints: 0,
      lines: opts.cart.map((i) => ({
        productId: i.productId,
        name: i.name,
        unitPrice: i.unitPrice,
        wholesalePrice: null,
        quantity: i.quantity,
        discount: 0,
        maxDiscount: 0,
        available: 0,
      })),
    });
    return {
      saleId: hold.id,
      reply: [
        "We saved your cart as a POS hold (could not post a sale yet).",
        summary,
        `Recall ${hold.id} on the register to complete.`,
      ].join("\n"),
    };
  }
}

async function trackWhatsAppOrder(
  query: string,
  phoneNumberId?: string,
): Promise<string> {
  if (!query) return "Send your order number.";
  const tenant = await resolveWhatsAppTenant(phoneNumberId);
  if (tenant) {
    const hit = await findWhatsAppSale(tenant, query.toUpperCase());
    if (hit) {
      return `${hit.id}: ${hit.fulfillmentStatus ?? hit.status ?? "received"} — ${formatMoney(hit.total)}`;
    }
    return "Order not found. Send the receipt id from your confirmation.";
  }
  const repo = await getRepository();
  const sales = await repo.listSales(80);
  const q = query.toUpperCase();
  const hit = sales.find(
    (s) =>
      s.id.toUpperCase() === q ||
      (s as { receiptNo?: string }).receiptNo?.toUpperCase() === q,
  );
  if (hit) {
    return `${hit.id}: ${hit.fulfillmentStatus ?? hit.status ?? "received"} — ${formatMoney(hit.total)}`;
  }
  return "Order not found. Send the receipt id from your confirmation.";
}
