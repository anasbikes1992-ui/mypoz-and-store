import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readWebsite } from "@/lib/server/website-store";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { readSettings } from "@/lib/server/settings-store";
import { storeTokenStyle, themeClass } from "@/lib/commerce/themes";
import { storeCopy } from "@/lib/commerce/i18n";
import { StorefrontAnalytics } from "@/components/storefront/Analytics";
import { StoreChrome } from "@/components/commerce/storefront/StoreChrome";
import {
  resolveStoreSlugAlias,
  rewriteStorePath,
} from "@/lib/store-slug-aliases";
import { CartProvider } from "./cart";

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | any;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "";
  const host = (await headers()).get("host");

  const [settings, storeEarly] = await Promise.all([
    readSettings(),
    readPublishedStore(),
  ]);
  // Tenant isolation: a real storefront for this slug wins over launch aliases.
  const direct = await getStorefrontInfo({ host, slug });
  const aliasTarget = resolveStoreSlugAlias(slug, {
    canonicalSlug: storeEarly.slug || settings.storeSlug,
    extraAliases: [
      ...(storeEarly.slugAliases ?? []),
      settings.storeSlugAliases,
    ],
    hasDirectStorefront: Boolean(direct),
  });
  if (aliasTarget && aliasTarget !== slug) {
    const hdrs = await headers();
    const invokePath =
      hdrs.get("x-invoke-path") ||
      hdrs.get("x-matched-path") ||
      hdrs.get("next-url") ||
      "";
    const pathFromHeader = (() => {
      try {
        if (invokePath.startsWith("http")) return new URL(invokePath).pathname;
        if (invokePath.startsWith("/")) return invokePath;
      } catch {
        /* ignore */
      }
      return `/store/${slug}`;
    })();
    permanentRedirect(rewriteStorePath(pathFromHeader, aliasTarget));
  }

  const info = direct ?? (await getStorefrontInfo({ host, slug }));
  if (!info) notFound();

  const [website, store] = await Promise.all([
    readWebsite(),
    Promise.resolve(storeEarly),
  ]);
  const t = storeCopy(store.locale);
  const theme = themeClass(store.themeId);
  const tokenStyle = storeTokenStyle(store.tokens || {});

  return (
    <div className={`${theme} min-h-screen font-sans`} style={tokenStyle}>
      <CartProvider
        slug={slug}
        businessName={info.businessName}
        whatsappNumber={
          store.social.whatsapp || website.whatsappNumber || info.whatsappNumber
        }
        currency={store.currency || "LKR"}
        website={website}
      >
        <StorefrontAnalytics
          ga4Id={info.ga4Id}
          googleAdsId={info.googleAdsId}
          metaPixelId={info.metaPixelId}
        />

        <a href="#main" className="skip-link">
          {t.skipToContent}
        </a>
        <StoreChrome slug={slug} store={store} businessName={info.businessName}>
          {children}
        </StoreChrome>
      </CartProvider>
    </div>
  );
}
