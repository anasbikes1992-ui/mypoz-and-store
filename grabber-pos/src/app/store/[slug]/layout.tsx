import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readWebsite } from "@/lib/server/website-store";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { themeClass } from "@/lib/commerce/themes";
import { storePath } from "@/lib/commerce/schema";
import { storeCopy } from "@/lib/commerce/i18n";
import { StorefrontAnalytics } from "@/components/storefront/Analytics";
import { CartProvider, CartButton } from "./cart";

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
        <header className="sticky top-0 z-30 border-b border-line bg-surface-1/95 backdrop-blur-md">
          <div
            className="mx-auto flex items-center justify-between gap-4 px-4 py-3.5 lg:px-8"
            style={{ maxWidth: "var(--mp-max)" }}
          >
            <Link href={storePath(slug)} className="flex min-w-0 items-center gap-3">
              {store.tokens.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.tokens.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent text-lg font-bold text-accent-ink" style={{ borderRadius: "var(--mp-radius)" }}>
                  {(store.name || info.businessName).charAt(0)}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold leading-tight text-text-strong sm:text-lg">
                  {store.name || info.businessName}
                </span>
                <span className="block text-xs text-text-dim">Official online store</span>
              </span>
            </Link>
            <nav aria-label="Store" className="flex shrink-0 items-center gap-1 sm:gap-2">
              {store.navigation.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  href={storePath(slug, item.href)}
                  className="hidden rounded-xl px-3 py-2 text-xs font-semibold text-text-dim transition hover:text-accent md:inline-flex"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={storePath(slug, "cart")}
                className="hidden rounded-xl border border-line px-3 py-2 text-xs font-semibold text-text-dim sm:inline-flex"
              >
                {t.cart}
              </Link>
              <Link
                href={storePath(slug, "search")}
                className="hidden rounded-xl border border-line px-3 py-2 text-xs font-semibold text-text-dim sm:inline-flex"
              >
                {t.search}
              </Link>
              <Link
                href={storePath(slug, "account")}
                className="hidden rounded-xl border border-line px-3 py-2 text-xs font-semibold text-text-dim sm:inline-flex"
              >
                {t.account}
              </Link>
              <CartButton />
            </nav>
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {children}
        </main>

        <footer className="mt-12 border-t border-line bg-surface-1 px-4 py-10 text-xs text-text-dim lg:px-8">
          <div className="mx-auto flex flex-col items-center gap-3" style={{ maxWidth: "var(--mp-max)" }}>
            <nav className="flex flex-wrap justify-center gap-3">
              {store.footerLinks.map((l) => (
                <Link key={l.id} href={storePath(slug, l.href)} className="hover:text-accent">
                  {l.label}
                </Link>
              ))}
            </nav>
            <p>
              © {new Date().getFullYear()} {store.name || info.businessName}. Pickup &amp; delivery
              at checkout.
            </p>
            <p>
              {t.poweredBy}
            </p>
          </div>
        </footer>
      </CartProvider>
    </div>
  );
}
