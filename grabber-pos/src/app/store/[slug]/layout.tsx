import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readWebsiteForStorefront } from "@/lib/server/website-store";
import { readPublishedStore } from "@/lib/server/commerce-store";
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

  // Resolve tenant first — never touch session doc stores before this.
  const direct = await getStorefrontInfo({ host, slug });
  // Launch map only (main-store → anaz-store). Do not apply session aliases.
  const aliasTarget = resolveStoreSlugAlias(slug, {
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

  if (!direct) notFound();

  const [website, store] = await Promise.all([
    readWebsiteForStorefront({ host, slug }),
    readPublishedStore(),
  ]);
  const t = storeCopy(store.locale);
  const theme = themeClass(store.themeId);
  const tokenStyle = storeTokenStyle(store.tokens || {});

  return (
    <div className={`${theme} min-h-screen font-sans`} style={tokenStyle}>
      <CartProvider
        slug={slug}
        businessName={direct.businessName}
        whatsappNumber={
          store.social.whatsapp || website.whatsappNumber || direct.whatsappNumber
        }
        currency={store.currency || "LKR"}
        website={website}
      >
        <StorefrontAnalytics
          ga4Id={direct.ga4Id}
          googleAdsId={direct.googleAdsId}
          metaPixelId={direct.metaPixelId}
        />

        <a href="#main" className="skip-link">
          {t.skipToContent}
        </a>
        <StoreChrome slug={slug} store={store} businessName={direct.businessName}>
          {children}
        </StoreChrome>
      </CartProvider>
    </div>
  );
}
