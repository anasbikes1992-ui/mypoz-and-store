/**
 * Shared storefront types and helpers (client + server).
 */

export interface StorefrontInfo {
  slug: string;
  domain: string | null;
  businessName: string;
  heroHeadline: string | null;
  heroSubline: string | null;
  heroImageUrl: string | null;
  about: string | null;
  whatsappNumber: string | null;
  ga4Id: string | null;
  googleAdsId: string | null;
  metaPixelId: string | null;
}

export interface StoreProduct {
  id: string;
  slug: string;
  name: string;
  nameLocal: string | null;
  description: string | null;
  brand: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl: string | null;
  stock: number;
  category: string | null;
  barcode?: string | null;
  featured?: boolean;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface StoreProductVariant {
  id: string;
  sku: string;
  title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  price: number;
  compareAtPrice: number | null;
  imageUrl: string | null;
  stock: number;
}

export interface StoreCatalog {
  items: StoreProduct[];
  total: number;
  page: number;
  size: number;
  categories: { name: string; count: number }[];
}

/**
 * Analytics IDs are rendered into script tags on a public page, so they are
 * matched against their exact vendor formats rather than trusted. Anything that
 * doesn't match is dropped — a malformed or hostile value simply disables that
 * tag instead of injecting into the page.
 */
const AD_ID_PATTERNS = {
  ga4: /^G-[A-Z0-9]{4,20}$/,
  googleAds: /^AW-\d{6,15}$/,
  metaPixel: /^\d{10,20}$/,
} as const;

export type AdIdKind = keyof typeof AD_ID_PATTERNS;

export function safeAdId(kind: AdIdKind, value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return AD_ID_PATTERNS[kind].test(trimmed) ? trimmed : null;
}

/** URL-safe slug, matching the backfill rule used in migration 0007. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

/** Order summary used for the WhatsApp handoff message. */
export function whatsAppOrderText(
  businessName: string,
  lines: { name: string; quantity: number; price: number }[],
  total: number,
  currency = "LKR",
  customer?: {
    name?: string;
    mobile?: string;
    address?: string;
    fulfilment?: string;
  },
): string {
  const items = lines
    .map((l) => `• ${l.name} × ${l.quantity} — ${currency} ${(l.price * l.quantity).toFixed(2)}`)
    .join("\n");
  const parts = [
    `Hello ${businessName}, I'd like to order:`,
    "",
    items,
    "",
    `Total: ${currency} ${total.toFixed(2)}`,
  ];
  const name = customer?.name?.trim();
  const mobile = customer?.mobile?.trim();
  const address = customer?.address?.trim();
  const fulfilment = customer?.fulfilment?.trim();
  if (name || mobile || address || fulfilment) {
    parts.push("", "— Customer —");
    if (name) parts.push(`Name: ${name}`);
    if (mobile) parts.push(`Mobile: ${mobile}`);
    if (fulfilment) parts.push(`Fulfilment: ${fulfilment}`);
    if (address) parts.push(`Address: ${address}`);
  }
  parts.push("", "Sent from the online store cart (Order via WhatsApp).");
  return parts.join("\n");
}

/** wa.me deep link. Returns null when the shop has no valid WhatsApp mobile set. */
export function whatsAppLink(number: string | null, text: string): string | null {
  if (!number || number.includes("@")) return null;
  const digits = number.replace(/\D/g, "");
  // LK mobiles are 947XXXXXXXX (11 digits) or local 07XXXXXXXX after strip.
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
