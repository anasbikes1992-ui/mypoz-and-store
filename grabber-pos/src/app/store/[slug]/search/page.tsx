import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { CatalogView } from "@/components/commerce/storefront/CatalogViews";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";
import { storeCopy } from "@/lib/commerce/i18n";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 100 }),
  ]);
  const t = storeCopy(store.locale);
  return (
    <>
      <CommerceTracker slug={slug} type="page_view" path={`/store/${slug}/search`} />
      <CatalogView
        slug={slug}
        store={store}
        products={catalog.items}
        categories={catalog.categories}
        title={t.search}
        initialSearch={q ?? ""}
      />
    </>
  );
}
