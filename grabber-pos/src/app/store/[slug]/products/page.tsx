import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { CatalogView } from "@/components/commerce/storefront/CatalogViews";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";
import { storeCopy } from "@/lib/commerce/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const store = await readPublishedStore();
  const t = storeCopy(store.locale);
  return { title: t.allProducts };
}

export default async function ProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 100 }),
  ]);
  return (
    <>
      <CommerceTracker slug={slug} type="page_view" path={`/store/${slug}/products`} />
      <CatalogView
        slug={slug}
        store={store}
        products={catalog.items}
        categories={catalog.categories}
      />
    </>
  );
}
