import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readWebsite } from "@/lib/server/website-store";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { themeClass } from "@/lib/commerce/themes";
import { storeCopy } from "@/lib/commerce/i18n";
import { StorefrontAnalytics } from "@/components/storefront/Analytics";
import { StoreChrome } from "@/components/commerce/storefront/StoreChrome";
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
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();

  const [website, store] = await Promise.all([readWebsite(), readPublishedStore()]);
  const t = storeCopy(store.locale);
  const theme = themeClass(store.themeId);

  return (
    <div className={`${theme} min-h-screen font-sans`}>
      <CartProvider
        slug={slug}
        businessName={info.businessName}
        whatsappNumber={store.social.whatsapp || website.whatsappNumber || info.whatsappNumber}
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
