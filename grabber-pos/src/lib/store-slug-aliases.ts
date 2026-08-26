/**
 * Canonical storefront slug redirects (308).
 * Prefer tenant/settings alias lists; keep a small launch map for Anaz SEO.
 *
 * Isolation rule: if a real storefront row exists for the requested slug,
 * that tenant wins — callers must check existence before applying the map.
 */

/** Built-in launch aliases → canonical public slug (Anaz continuity). */
export const STORE_SLUG_ALIAS_MAP: Readonly<Record<string, string>> = {
  "main-store": "anaz-store",
  "shopping-station": "anaz-store",
};

/** Slugs new tenants must not claim (reserved for Anaz launch aliases). */
export const RESERVED_STOREFRONT_SLUGS: ReadonlySet<string> = new Set([
  "main-store",
  "shopping-station",
  "anaz-store",
]);

export function isReservedStorefrontSlug(slug: string): boolean {
  return RESERVED_STOREFRONT_SLUGS.has(slug.trim().toLowerCase());
}

export function parseSlugAliasList(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : raw.split(/[,;\s]+/);
  return parts
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0 && s.length <= 80);
}

/**
 * Resolve a requested URL slug to its canonical slug, or null if no redirect.
 * Pass `hasDirectStorefront: true` when a storefront already owns `requestedSlug`.
 */
export function resolveStoreSlugAlias(
  requestedSlug: string,
  opts?: {
    canonicalSlug?: string | null;
    extraAliases?: string[] | string | null;
    /** When true, never redirect away from this slug (tenant isolation). */
    hasDirectStorefront?: boolean;
  },
): string | null {
  const key = requestedSlug.trim().toLowerCase();
  if (!key) return null;
  if (opts?.hasDirectStorefront) return null;

  const fromMap = STORE_SLUG_ALIAS_MAP[key];
  if (fromMap && fromMap !== key) return fromMap;

  const canonical = (opts?.canonicalSlug ?? "").trim().toLowerCase();
  if (!canonical || canonical === key) return null;

  const aliases = new Set(parseSlugAliasList(opts?.extraAliases));
  if (aliases.has(key)) return canonical;

  return null;
}

/** Rewrite `/store/{alias}/…` → `/store/{canonical}/…`. */
export function rewriteStorePath(pathname: string, canonicalSlug: string): string {
  const m = pathname.match(/^\/store\/([^/]+)(.*)$/);
  if (!m) return `/store/${canonicalSlug}`;
  return `/store/${canonicalSlug}${m[2] || ""}`;
}
