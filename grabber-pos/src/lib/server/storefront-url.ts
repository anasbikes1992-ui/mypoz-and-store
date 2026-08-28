import "server-only";
import { headers } from "next/headers";
import { getStorefrontInfo } from "./storefront-repo";
export { buildStorefrontUrl, invoiceStorefrontCta } from "./storefront-cta";

/**
 * Absolute URLs for a storefront.
 *
 * SEO credit only accrues to the client when their pages advertise their own
 * domain, so canonical URLs, sitemaps and ad feeds are all built from the
 * storefront's configured domain when it has one, falling back to the request
 * host while a client is still on the shared preview path.
 */
export async function storeOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Base URL of the shop itself, e.g. https://shop.lk or https://host/store/slug. */
export async function storeBaseUrl(slug: string): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const info = await getStorefrontInfo({ host, slug });
  const proto = h.get("x-forwarded-proto") ?? "https";

  if (info?.domain && host && info.domain.toLowerCase() === host.toLowerCase()) {
    return `${proto}://${info.domain}`;
  }
  if (info?.domain) return `${proto}://${info.domain}`;
  return `${await storeOrigin()}/store/${slug}`;
}

export async function canonicalFor(
  slug: string,
  query: { q?: string; category?: string; page?: string } = {},
): Promise<string> {
  const base = await storeBaseUrl(slug);
  const sp = new URLSearchParams();
  if (query.category) sp.set("category", query.category);
  if (query.page && Number(query.page) > 1) sp.set("page", query.page);
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}
