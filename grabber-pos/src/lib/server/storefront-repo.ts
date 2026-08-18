import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseEnabled } from "@/lib/supabase/config";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "./settings-store";
import { readWebsite } from "./website-store";
import { createClickCollect } from "./click-collect-store";
import { createOrderFromStorefront } from "./delivery-store";
import { saveStorefrontWebOrder, findStorefrontOrderBySaleOrReceipt, updateStorefrontWebOrder } from "./storefront-orders-store";
import { readPublishedStore } from "./commerce-store";
import { quoteDelivery } from "@/lib/commerce/delivery";
import {
  slugify,
  type StorefrontInfo,
  type StoreCatalog,
  type StoreProduct,
  type StoreProductVariant,
} from "@/lib/storefront";
import { parseCommerceLineId } from "@/lib/commerce/line-ids";
import { listVariants } from "./variants-repo";
import type { FulfilmentMode, PaymentMode, WebsiteConfig } from "@/lib/website";
import type { Product } from "@/lib/types";

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface StorefrontKey {
  host: string | null;
  slug: string | null;
}

function localInfo(
  businessName: string,
  website: WebsiteConfig,
  settingsWhatsapp: string,
): StorefrontInfo {
  return {
    slug: "main-store",
    domain: null,
    businessName,
    heroHeadline: website.heroHeadline || businessName,
    heroSubline:
      website.heroSubline || "Shop online — fast local delivery",
    heroImageUrl: website.banners[0]?.imageUrl || website.ogImageUrl || null,
    about: website.about || null,
    whatsappNumber: website.whatsappNumber || settingsWhatsapp || null,
    ga4Id: null,
    googleAdsId: null,
    metaPixelId: null,
  };
}

/** True when the product should appear on the public catalog (local path). */
export function isOnlineVisible(p: Product): boolean {
  const flag = (p as Product & { onlineVisible?: boolean }).onlineVisible;
  // Demo JSON products rarely set the flag — treat unset as visible.
  return flag !== false;
}

export async function getStorefrontInfo(key: StorefrontKey): Promise<StorefrontInfo | null> {
  const settings = await readSettings();
  const website = await readWebsite();
  if (!website.enabled) {
    return null;
  }

  const defaultInfo = localInfo(
    settings.businessName || "MyPoz Store",
    website,
    settings.socialWhatsapp || settings.phone || "",
  );

  // Prefer settings slug when host/slug match local demo.
  if (key.slug) {
    defaultInfo.slug = key.slug;
  } else if (settings.storeSlug) {
    defaultInfo.slug = settings.storeSlug;
  }

  if (!isSupabaseEnabled) {
    return defaultInfo;
  }

  try {
    const { data, error } = await anonClient().rpc("storefront_info", {
      p_host: key.host,
      p_slug: key.slug,
    });
    if (error || !data) {
      return defaultInfo;
    }
    const remote = data as StorefrontInfo;
    return {
      ...remote,
      heroHeadline: website.heroHeadline || remote.heroHeadline,
      heroSubline: website.heroSubline || remote.heroSubline,
      heroImageUrl:
        website.banners[0]?.imageUrl ||
        website.ogImageUrl ||
        remote.heroImageUrl,
      about: website.about || remote.about,
      whatsappNumber:
        website.whatsappNumber || remote.whatsappNumber || defaultInfo.whatsappNumber,
    };
  } catch {
    return defaultInfo;
  }
}

export async function getStorefrontCatalog(
  key: StorefrontKey,
  q: { search?: string; category?: string; page?: number; size?: number } = {},
): Promise<StoreCatalog> {
  const page = Math.max(q.page ?? 1, 1);
  const size = Math.min(Math.max(q.size ?? 24, 1), 100);

  const fallbackCatalog = async (): Promise<StoreCatalog> => {
    const repo = await getRepository();
    const pPage = await repo.queryProducts({
      pageSize: 500,
      search: q.search,
      category: q.category,
    });
    const visible = pPage.items.filter(isOnlineVisible);
    const start = (page - 1) * size;
    const slice = visible.slice(start, start + size);
    const categoryCounts = new Map<string, number>();
    for (const p of visible) {
      if (!p.category) continue;
      categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
    }
    return {
      items: slice.map((p) => ({
        id: p.id,
        slug: slugify(p.name),
        name: p.name,
        nameLocal: p.nameLocal,
        description: null,
        brand: p.brand,
        price: p.salePrice,
        imageUrl: p.imageUrl ?? null,
        stock: p.quantity,
        category: p.category,
      })),
      total: visible.length,
      page,
      size,
      categories: [...categoryCounts.entries()].map(([name, count]) => ({
        name,
        count,
      })),
    };
  };

  if (!isSupabaseEnabled) {
    return fallbackCatalog();
  }

  try {
    const { data, error } = await anonClient().rpc("storefront_catalog", {
      p_host: key.host,
      p_slug: key.slug,
      p_search: q.search ?? null,
      p_category: q.category ?? null,
      p_page: page,
      p_size: size,
    });
    if (error || !data) {
      return fallbackCatalog();
    }
    return data as StoreCatalog;
  } catch {
    return fallbackCatalog();
  }
}

export async function getStorefrontProduct(
  key: StorefrontKey,
  productSlug: string,
): Promise<StoreProduct | null> {
  const fallbackProduct = async (): Promise<StoreProduct | null> => {
    const repo = await getRepository();
    const pPage = await repo.queryProducts({ pageSize: 500 });
    const match = pPage.items
      .filter(isOnlineVisible)
      .find((p) => slugify(p.name) === productSlug || p.id === productSlug);
    if (!match) return null;
    return {
      id: match.id,
      slug: slugify(match.name),
      name: match.name,
      nameLocal: match.nameLocal,
      description: null,
      brand: match.brand,
      price: match.salePrice,
      imageUrl: match.imageUrl ?? null,
      stock: match.quantity,
      category: match.category,
    };
  };

  if (!isSupabaseEnabled) {
    return fallbackProduct();
  }

  try {
    const { data, error } = await anonClient().rpc("storefront_product", {
      p_host: key.host,
      p_slug: key.slug,
      p_product: productSlug,
    });
    if (error || !data) {
      return fallbackProduct();
    }
    return data as StoreProduct;
  } catch {
    return fallbackProduct();
  }
}

export async function getStorefrontProductVariants(
  key: StorefrontKey,
  product: StoreProduct,
): Promise<StoreProductVariant[]> {
  const fromLocal = async (): Promise<StoreProductVariant[]> => {
    const rows = await listVariants(product.id);
    return rows.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      price: v.salePrice ?? product.price,
      compareAtPrice: v.compareAtPrice,
      imageUrl: v.imageUrl ?? product.imageUrl,
      stock: v.quantity,
    }));
  };

  if (!isSupabaseEnabled) return fromLocal();

  try {
    const { data, error } = await anonClient().rpc("storefront_product_variants", {
      p_host: key.host,
      p_slug: key.slug,
      p_product: product.slug,
    });
    if (error || !data) return fromLocal();
    const rows = data as StoreProductVariant[];
    return Array.isArray(rows) ? rows : fromLocal();
  } catch {
    return fromLocal();
  }
}

export async function getStorefrontProductSlugs(
  key: StorefrontKey,
): Promise<{ slug: string; updatedAt: string }[]> {
  const catalog = await getStorefrontCatalog(key, { size: 500 });
  return catalog.items.map((p) => ({
    slug: p.slug,
    updatedAt: new Date().toISOString(),
  }));
}

export interface StoreOrderInput {
  customerName: string;
  customerMobile: string;
  customerEmail?: string | null;
  customerId?: string | null;
  address: string;
  pickupNote?: string;
  paymentMethod: PaymentMode;
  paymentReference?: string;
  fulfilment: FulfilmentMode;
  deliveryZoneId?: string | null;
  clientUuid: string;
  lines: { productId: string; quantity: number; variantId?: string | null }[];
  discountCode?: string | null;
}

export async function placeStorefrontOrder(
  key: StorefrontKey,
  input: StoreOrderInput,
): Promise<{
  id: string;
  receiptNo: string;
  total: number;
  boardId: string | null;
  boardKind: "click-collect" | "delivery" | null;
  pendingPayment?: boolean;
}> {
  const website = await readWebsite();
  if (!website.enabled) {
    throw new Error("STOREFRONT: online ordering is disabled");
  }
  if (!website.paymentModes.includes(input.paymentMethod)) {
    throw new Error("ORDER: payment method is not available");
  }
  if (!website.fulfilmentModes.includes(input.fulfilment)) {
    throw new Error("ORDER: fulfilment mode is not available");
  }

  const repo = await getRepository();
  const productsPage = await repo.queryProducts({ pageSize: 500 });
  const visible = productsPage.items.filter(isOnlineVisible);
  const allVariants = await listVariants();

  const resolvedLines = input.lines.map((line) => {
    const parsed = parseCommerceLineId(line.productId);
    const productId = parsed.productId;
    const variantId = line.variantId ?? parsed.variantId;
    const matched = visible.find(
      (p) =>
        p.id === productId ||
        p.barcodes?.includes(productId) ||
        slugify(p.name) === productId,
    );
    if (!matched) {
      throw new Error(`PRODUCT: ${line.productId} is not available online`);
    }
    const productVariants = allVariants.filter(
      (v) => String(v.productId) === String(matched.id) && v.isActive,
    );
    let variant = variantId
      ? productVariants.find((v) => v.id === variantId)
      : parsed.variantSku
        ? productVariants.find((v) => v.sku === parsed.variantSku)
        : undefined;
    if (productVariants.length > 0 && !variant) {
      throw new Error(`VARIANT: ${matched.name} requires a variant`);
    }
    const unitPrice = variant?.salePrice ?? matched.salePrice;
    const displayName = variant
      ? `${matched.name} — ${variant.title}`
      : matched.name;
    return {
      productId: matched.id,
      variantId: variant?.id ?? null,
      variantSku: variant?.sku ?? null,
      name: displayName,
      unitPrice,
      quantity: Math.max(1, Number(line.quantity) || 1),
      discount: 0,
    };
  });

  // Map storefront payment modes onto POS sale methods (card stays card; bank → cash pending).
  const salePayment: "cash" | "card" =
    input.paymentMethod === "card" ? "card" : "cash";

  // Card / online: PENDING ledger only. No stock, no register, no durable sale row
  // until applyGatewayWebhook → completePendingSale (Postgres has no pending sale_status).
  const isCardPending = input.paymentMethod === "card";
  const lineTotal = resolvedLines.reduce(
    (s, l) => s + l.unitPrice * l.quantity,
    0,
  );

  const storeConfig = await readPublishedStore();
  const quote = quoteDelivery(storeConfig, {
    subtotal: lineTotal,
    fulfilment: input.fulfilment,
    zoneId: input.deliveryZoneId,
    paymentMethod: input.paymentMethod,
  });

  let finalDiscount = 0;
  let discountCodeId: string | undefined;
  if (input.discountCode) {
    const { validateDiscountCode, consumeDiscountCode } = await import(
      "@/lib/server/discount-codes"
    );
    const applied = await validateDiscountCode(input.discountCode, lineTotal);
    if (!applied.ok) {
      throw new Error(`ORDER: ${applied.error}`);
    }
    finalDiscount = applied.discount;
    discountCodeId = applied.id;
    if (!isCardPending) {
      await consumeDiscountCode(discountCodeId);
    }
  }
  const payable = Math.max(0, quote.total - finalDiscount);

  let saleId: string;
  let receiptNo: string;
  let total: number;

  if (isCardPending) {
    const { randomUUID } = await import("crypto");
    receiptNo = `WEB-${randomUUID().slice(0, 8).toUpperCase()}`;
    saleId = receiptNo;
    total = payable;
  } else {
    const sale = await repo.createSale({
      paymentMethod: salePayment,
      lines: resolvedLines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        discount: 0,
        variantId: l.variantId,
        variantSku: l.variantSku,
        name: l.name,
        unitPrice: l.unitPrice,
      })),
      customerName: input.customerName,
      customerMobile: input.customerMobile,
      clientUuid: input.clientUuid,
      cashReceived: payable,
      status: "completed",
      source: "ONLINE_STORE",
      channel: "storefront",
      fulfillmentStatus: input.fulfilment === "pickup" ? "ready" : "pending",
      paymentStatus: "paid",
      deliveryAddress: input.address,
      deliveryFee: quote.deliveryFee,
      codFee: quote.codFee,
      serviceCharge: quote.deliveryFee + quote.codFee,
      finalDiscount,
    });
    const s = sale as unknown as Record<string, unknown>;
    receiptNo =
      (s.receiptNo as string) || (s.receipt_no as string) || sale.id;
    saleId = sale.id;
    total = Number(sale.total || 0);
  }
  const itemsSummary = resolvedLines
    .map((l) => `${l.name} × ${l.quantity}`)
    .join("\n");

  const noteParts = [
    `Web order ${receiptNo}`,
    `Pay: ${input.paymentMethod}`,
    isCardPending ? "AWAITING_GATEWAY_PAYMENT" : null,
    input.paymentReference ? `Ref: ${input.paymentReference}` : null,
    input.pickupNote ? `Note: ${input.pickupNote}` : null,
    input.customerEmail ? `Email: ${input.customerEmail}` : null,
  ].filter(Boolean);

  let boardId: string | null = null;
  let boardKind: "click-collect" | "delivery" | null = null;

  // Do not put card orders on fulfilment boards until webhook confirms PAID.
  if (!isCardPending) {
    if (input.fulfilment === "pickup") {
      const cc = await createClickCollect({
        customer: input.customerName,
        phone: input.customerMobile,
        items: itemsSummary,
        note: noteParts.join(" · "),
        status: "new",
        source: "storefront",
        saleId,
        receiptNo,
      });
      boardId = cc.id;
      boardKind = "click-collect";
    } else {
      const del = await createOrderFromStorefront({
        customer: input.customerName,
        phone: input.customerMobile,
        address:
          input.address ||
          `${input.fulfilment.toUpperCase()} — address TBD`,
        note: noteParts.join(" · "),
        fulfilment: input.fulfilment,
        lines: resolvedLines.map((l) => ({
          productId: l.productId,
          name: l.name,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
        })),
        saleId,
        receiptNo,
      });
      boardId = del.id;
      boardKind = "delivery";
    }
  }

  await saveStorefrontWebOrder({
    receiptNo,
    saleId,
    slug: key.slug || "main-store",
    customerName: input.customerName,
    customerMobile: input.customerMobile,
    customerEmail: input.customerEmail ?? null,
    customerId: input.customerId ?? null,
    address: input.address,
    pickupNote: input.pickupNote ?? "",
    paymentMethod: input.paymentMethod,
    paymentReference: input.paymentReference ?? "",
    fulfilment: input.fulfilment,
    lines: resolvedLines.map((l) => ({
      productId: l.productId,
      name: l.name,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      variantId: l.variantId,
    })),
    total,
    deliveryFee: quote.deliveryFee,
    codFee: quote.codFee,
    finalDiscount,
    source: "ONLINE_STORE",
    fulfillmentStatus: input.fulfilment === "pickup" ? "ready" : "pending",
    boardId,
    boardKind,
    pendingPayment: isCardPending,
  });

  return { id: saleId, receiptNo, total, boardId, boardKind, pendingPayment: isCardPending };
}

/**
 * After gateway webhook marks PAID and sale is completed, place fulfilment boards.
 */
export async function fulfillPendingStorefrontBoards(
  saleId: string,
  receiptNo: string,
): Promise<void> {
  const order = await findStorefrontOrderBySaleOrReceipt(saleId, receiptNo);
  if (!order || !order.pendingPayment) return;
  if (order.boardId) {
    await updateStorefrontWebOrder(order.id, { pendingPayment: false });
    return;
  }

  const itemsSummary = order.lines.map((l) => `${l.name} × ${l.quantity}`).join("\n");
  const note = `Web order ${order.receiptNo} · Pay: ${order.paymentMethod} · PAID`;

  let boardId: string | null = null;
  let boardKind: "click-collect" | "delivery" | null = null;

  if (order.fulfilment === "pickup") {
    const cc = await createClickCollect({
      customer: order.customerName,
      phone: order.customerMobile,
      items: itemsSummary,
      note,
      status: "new",
      source: "storefront",
      saleId: order.saleId ?? saleId,
      receiptNo: order.receiptNo,
    });
    boardId = cc.id;
    boardKind = "click-collect";
  } else {
    const del = await createOrderFromStorefront({
      customer: order.customerName,
      phone: order.customerMobile,
      address: order.address || `${order.fulfilment.toUpperCase()} — address TBD`,
      note,
      fulfilment: order.fulfilment,
      lines: order.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
      })),
      saleId: order.saleId ?? saleId,
      receiptNo: order.receiptNo,
    });
    boardId = del.id;
    boardKind = "delivery";
  }

  await updateStorefrontWebOrder(order.id, {
    boardId,
    boardKind,
    pendingPayment: false,
  });
}
