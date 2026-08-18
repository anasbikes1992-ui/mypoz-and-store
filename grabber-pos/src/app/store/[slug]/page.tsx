import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { readSettings } from "@/lib/server/settings-store";
import { HomeSections } from "@/components/commerce/storefront/HomeSections";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await readPublishedStore();
  const settings = await readSettings();
  const title = store.seoTitle || `${store.name || settings.businessName} — Online Store`;
  const description =
    store.seoDescription ||
    settings.storeSlogan ||
    `Shop online at ${store.name}. Live stock from MyPoz.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    robots: { index: store.status === "published", follow: store.status === "published" },
  };
}

export default async function TenantStorePage({
  params,
}: {
  params: Promise<{ slug: string }> | any;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || "main-store";
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();

  const [store, catalog, settings] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 24 }),
    readSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name || info.businessName,
    description: store.seoDescription || settings.storeSlogan,
    telephone: store.contactPhone || settings.phone,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommerceTracker slug={slug} type="page_view" path={`/store/${slug}`} />
      <HomeSections
        slug={slug}
        store={store}
        products={catalog.items}
        categories={catalog.categories}
      />
    </>
  );
}
