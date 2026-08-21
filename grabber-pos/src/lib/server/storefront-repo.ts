import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseEnabled } from "@/lib/supabase/config";
import { getRepository } from "@/lib/server/repositories";
import { createServiceSupabase } from "@/lib/supabase/server";
import { computeDiscount, normalizeCode, type DiscountCodeRecord } from "@/lib/commerce/discount-codes";
import { readSettings } from "./settings-store";
import { readWebsite, readWebsiteForStorefront } from "./website-store";
import { createClickCollect } from "./click-collect-store";
import { createOrderFromStorefront } from "./delivery-store";
import {
  saveStorefrontWebOrder,
  findStorefrontOrderBySaleOrReceipt,
  updateStorefrontWebOrder,
  assertNoLocalFallbackForPublicOrders,
} from "./storefront-orders-store";
import { readPublishedStore } from "./commerce-store";
import { quoteDelivery } from "@/lib/commerce/delivery";
import { initialPaymentProofStatus } from "@/lib/commerce/payment-proof";
import { upsertPosCustomer } from "./pos-customer-link";
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

function useServiceLedger(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function resolveStorefrontOrgId(key: StorefrontKey): Promise<string> {
  if (!useServiceLedger()) throw new Error("Service ledger unavailable");
  const db = createServiceSupabase();
  const { data, error } = await (db as any).rpc("storefront_by_host", {
    p_host: key.host ?? "",
    p_slug: key.slug ?? "",
  });
  if (error) throw new Error(error.message);
  const row = data as { org_id?: string | null } | null;
  const orgId = row?.org_id ?? null;
  if (!orgId) throw new Error("Could not resolve storefront org_id");
  return orgId;
}

async function validateDiscountCodeServiceOrg(opts: {
  orgId: string;
  code: string;
  subtotal: number;
}): Promise<
  | { ok: true; discount: number; code: string; id: string }
  | { ok: false; error: string }
> {
  const needle = normalizeCode(opts.code);
  const db = createServiceSupabase();
  const { data, error } = await db
    .from("app_collections")
    .select("data")
    .eq("org_id", opts.orgId)
    .eq("collection", "discount_codes")
    .limit(200);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { data?: Record<string, unknown> }[];
  const match = rows
    .map((r) => r.data ?? null)
    .filter((r): r is Record<string, unknown> => Boolean(r))
    .find((d) => normalizeCode(String(d.code ?? "")) === needle);

  if (!match) return { ok: false, error: "Unknown discount code" };
  const rec: DiscountCodeRecord = {
    id: String((match as Record<string, unknown>).id ?? ""),
    code: String(match.code ?? ""),
    kind: (String(match.kind ?? "fixed") === "percent" ? "percent" : "fixed") as
      | "percent"
      | "fixed",
    amount: Number(match.amount ?? 0) || 0,
    minSubtotal: Number((match as Record<string, unknown>).minSubtotal ?? 0) || 0,
    maxUses: Number((match as Record<string, unknown>).maxUses ?? 0) || 0,
    usedCount: Number((match as Record<string, unknown>).usedCount ?? 0) || 0,
    expiry: String(match.expiry ?? ""),
    status: String(match.status ?? "active"),
  };
  const computed = computeDiscount(rec, opts.subtotal);
  if (!computed.ok) return { ok: false, error: computed.error };
  return { ok: true, discount: computed.discount, code: rec.code, id: rec.id ?? "" };
}

async function consumeDiscountCodeServiceOrg(opts: {
  orgId: string;
  id: string | undefined;
}): Promise<void> {
  if (!opts.id) return;
  const db = createServiceSupabase();
  const { data: existing, error } = await db
    .from("app_collections")
    .select("data")
    .eq("org_id", opts.orgId)
    .eq("collection", "discount_codes")
    .eq("entity_id", opts.id)
    .maybeSingle<{ data?: Record<string, unknown> }>();
  if (error) throw new Error(error.message);
  if (!existing?.data) return;

  const prev = Number((existing.data as Record<string, unknown>).usedCount ?? 0) || 0;
  const nextData = { ...(existing.data as Record<string, unknown>), usedCount: prev + 1 };
  const { error: upErr } = await db
    .from("app_collections")
    .update({ data: nextData })
    .eq("org_id", opts.orgId)
    .eq("collection", "discount_codes")
    .eq("entity_id", opts.id);
  if (upErr) throw new Error(upErr.message);
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
  // Unset means visible on the local JSON backend (empty seed + overrides).
  return flag !== false;
}

export async function getStorefrontInfo(key: StorefrontKey): Promise<StorefrontInfo | null> {
  const settings = await readSettings();
  const website = await readWebsiteForStorefront({
    host: key.host,
    slug: key.slug,
  });
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
  return fetchStorefrontCatalogPage(key, { ...q, page, size });
}

/** Full online catalog for Meta / WhatsApp CSV feeds (pages through RPC). */
export async function getStorefrontCatalogExport(
  key: StorefrontKey,
  q: { search?: string; category?: string } = {},
): Promise<StoreCatalog> {
  const pageSize = 100;
  let page = 1;
  let total = Infinity;
  const items: StoreCatalog["items"] = [];
  let categories: StoreCatalog["categories"] = [];

  while (items.length < total) {
    const chunk = await fetchStorefrontCatalogPage(key, {
      ...q,
      page,
      size: pageSize,
    });
    if (page === 1) {
      total = chunk.total;
      categories = chunk.categories;
    }
    items.push(...chunk.items);
    if (!chunk.items.length || chunk.items.length < pageSize) break;
    page += 1;
    if (page > 200) break; // hard stop ~20k SKUs
  }

  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
    page: 1,
    size: items.length,
    categories,
  };
}

async function fetchStorefrontCatalogPage(
  key: StorefrontKey,
  q: { search?: string; category?: string; page: number; size: number },
): Promise<StoreCatalog> {
  const { page, size } = q;

  const fallbackCatalog = async (): Promise<StoreCatalog> => {
    if (isSupabaseEnabled) {
      throw new Error("STORE: storefront_catalog RPC failed in fail-closed mode");
    }
    // Local demo fallback (only used when Supabase is disabled).
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
      return { items: [], total: 0, page, size, categories: [] };
    }
    return data as StoreCatalog;
  } catch {
    // Fail closed: never serve local JSON. Empty catalog is safe for prerender.
    return { items: [], total: 0, page, size, categories: [] };
  }
}

export async function getStorefrontProduct(
  key: StorefrontKey,
  productSlug: string,
): Promise<StoreProduct | null> {
  const fallbackProduct = async (): Promise<StoreProduct | null> => {
    if (isSupabaseEnabled) {
      throw new Error("STORE: storefront_product RPC failed in fail-closed mode");
    }
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
    if (error || !data) return null;
    return data as StoreProduct;
  } catch {
    return null;
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
    if (error || !data) return [];
    const rows = data as StoreProductVariant[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
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
  /** Bank slip proof — data URL or https URL. */
  paymentProofUrl?: string;
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
  /** Stable web-order entity id (WEB-*). */
  id: string;
  saleId: string;
  receiptNo: string;
  total: number;
  boardId: string | null;
  boardKind: "click-collect" | "delivery" | null;
  pendingPayment?: boolean;
}> {
  // Fail early before we commit a sale if the service-role ledger is required
  // for storefront order persistence but is not configured.
  assertNoLocalFallbackForPublicOrders();

  const website = await readWebsiteForStorefront({
    host: key.host,
    slug: key.slug,
  });
  if (!website.enabled) {
    throw new Error("STOREFRONT: online ordering is disabled");
  }
  if (!website.paymentModes.includes(input.paymentMethod)) {
    throw new Error("ORDER: payment method is not available");
  }
  if (!website.fulfilmentModes.includes(input.fulfilment)) {
    throw new Error("ORDER: fulfilment mode is not available");
  }

  let repo: Awaited<ReturnType<typeof getRepository>> | null = null;

  const resolvedLines = isSupabaseEnabled
    ? await (async () => {
        // Resolve products/variants for anonymous shoppers using the public
        // storefront RPCs. In fail-closed mode we never fall back to local JSON.
        const uniqueProductIds = [
          ...new Set(input.lines.map((l) => String(l.productId))),
        ];
        const missing = new Set(uniqueProductIds);

        const productsById = new Map<string, StoreProduct>();
        const maxPages = 20; // 20 * 100 items = 2000 products max lookup per checkout.
        for (let p = 1; p <= maxPages && missing.size > 0; p += 1) {
          const { data, error } = await anonClient().rpc("storefront_catalog", {
            p_host: key.host,
            p_slug: key.slug,
            p_search: null,
            p_category: null,
            p_page: p,
            p_size: 100,
          });
          if (error || !data) {
            throw new Error(
              error?.message ?? "ORDER: storefront_catalog lookup failed",
            );
          }
          const catalog = data as StoreCatalog;
          for (const item of catalog.items) {
            if (missing.has(item.id)) {
              productsById.set(item.id, item);
              missing.delete(item.id);
            }
          }
        }

        if (missing.size > 0) {
          throw new Error(
            "ORDER: selected product is currently unavailable for online order",
          );
        }

        // Fetch variants for each product slug returned by the catalog.
        const variantMapsByProductId = new Map<
          string,
          Map<string, StoreProductVariant>
        >();
        for (const product of productsById.values()) {
          const { data, error } = await anonClient().rpc(
            "storefront_product_variants",
            {
              p_host: key.host,
              p_slug: key.slug,
              p_product: product.slug,
            },
          );
          if (error || !data) {
            throw new Error(
              error?.message ?? "ORDER: storefront variants lookup failed",
            );
          }
          const variants = (Array.isArray(data) ? data : []) as StoreProductVariant[];
          variantMapsByProductId.set(
            product.id,
            new Map(variants.map((v) => [v.id, v])),
          );
        }

        return input.lines.map((line) => {
          const product = productsById.get(String(line.productId));
          if (!product) {
            throw new Error(
              `PRODUCT: ${line.productId} is not available online`,
            );
          }

          const variantId = line.variantId ?? null;
          const variantsMap = variantMapsByProductId.get(product.id) ?? new Map();
          const variant = variantId ? variantsMap.get(variantId) : null;

          // When a product has variants, a variantId is required for checkout.
          if (variantsMap.size > 0 && !variantId) {
            throw new Error(`VARIANT: ${product.name} requires a variant`);
          }
          if (variantId && !variant) {
            throw new Error(`VARIANT: selected variant is not available`);
          }

          const unitPrice = variant?.price ?? product.price;
          const displayName = variant
            ? `${product.name} — ${variant.title}`
            : product.name;

          return {
            productId: product.id,
            variantId: variant?.id ?? null,
            variantSku: variant?.sku ?? null,
            name: displayName,
            unitPrice,
            quantity: Math.max(1, Number(line.quantity) || 1),
            discount: 0,
          };
        });
      })()
    : await (async () => {
        // Local demo path (Supabase disabled): legacy repository resolution.
        repo = await getRepository();
        const productsPage = await repo.queryProducts({ pageSize: 500 });
        const visible = productsPage.items.filter(isOnlineVisible);
        const allVariants = await listVariants();

        return input.lines.map((line) => {
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

          const variant = variantId
            ? productVariants.find((v) => v.id === variantId) ?? undefined
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
      })();

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
    if (isSupabaseEnabled && useServiceLedger()) {
      const orgId = await resolveStorefrontOrgId(key);
      const applied = await validateDiscountCodeServiceOrg({
        orgId,
        code: input.discountCode,
        subtotal: lineTotal,
      });
      if (!applied.ok) throw new Error(`ORDER: ${applied.error}`);
      finalDiscount = applied.discount;
      discountCodeId = applied.id;
      if (!isCardPending) {
        await consumeDiscountCodeServiceOrg({ orgId, id: discountCodeId });
      }
    } else {
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
    if (isSupabaseEnabled) {
      const { data, error } = await anonClient().rpc("storefront_create_order", {
        p_host: key.host,
        p_slug: key.slug,
        p_payload: {
          customerName: input.customerName,
          customerMobile: input.customerMobile,
          clientUuid: input.clientUuid,
          address: input.address,
          fulfilment: input.fulfilment,
          paymentMethod: input.paymentMethod,
          deliveryFee: quote.deliveryFee,
          codFee: quote.codFee,
          final_discount: finalDiscount,
          lines: resolvedLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            variantId: l.variantId,
          })),
        },
      });
      if (error || !data) {
        throw new Error(error?.message ?? "ORDER: storefront_create_order failed");
      }
      const s = data as Record<string, unknown>;
      receiptNo =
        (s.receipt_no as string) ||
        (s.receiptNo as string) ||
        String(s.id ?? ""); // fallback
      saleId = String(s.id ?? receiptNo);
      total = Number(s.total ?? payable);
    } else {
      if (!repo) throw new Error("Local repository missing");
      const sale = await (repo as any).createSale({
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
  }

  // Unify: link storefront shopper into the shared POS customers table so
  // counter staff and reports see one customer, not two separate stores.
  void upsertPosCustomer({
    name: input.customerName,
    email: input.customerEmail ?? null,
    mobile: input.customerMobile,
  }).catch(() => {/* best-effort — never block the order response */});

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

  const webOrder = await saveStorefrontWebOrder(
    {
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
      ...(input.paymentMethod === "bank_transfer"
        ? {
            ...(input.paymentProofUrl
              ? { paymentProofUrl: input.paymentProofUrl }
              : {}),
            paymentProofStatus: initialPaymentProofStatus(
              input.paymentMethod,
              input.paymentProofUrl,
            ),
          }
        : {}),
    },
    { host: key.host, slug: key.slug },
  );

  return {
    id: webOrder.id,
    saleId,
    receiptNo: webOrder.receiptNo || receiptNo,
    total,
    boardId,
    boardKind,
    pendingPayment: isCardPending,
  };
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
