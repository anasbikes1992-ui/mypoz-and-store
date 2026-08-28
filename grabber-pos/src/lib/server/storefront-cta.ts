import type { Settings } from "@/lib/settings";

/** Public storefront URL from tenant settings (receipts / WhatsApp). */
export function buildStorefrontUrl(
  settings: Pick<Settings, "storeSlug">,
  baseUrl?: string,
): string | null {
  const slug = settings.storeSlug?.trim();
  if (!slug) return null;
  const host = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(
    /\/$/,
    "",
  );
  if (!host) return `/store/${encodeURIComponent(slug)}`;
  return `${host}/store/${encodeURIComponent(slug)}`;
}

export function invoiceStorefrontCta(
  settings: Pick<Settings, "storeSlug" | "receiptFooter">,
  baseUrl?: string,
): string | null {
  const url = buildStorefrontUrl(settings, baseUrl);
  if (!url) return settings.receiptFooter?.trim() || null;
  return `Shop online anytime: ${url}`;
}
