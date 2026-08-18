import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { CatalogView } from "@/components/commerce/storefront/CatalogViews";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";
import { slugify } from "@/lib/storefront";
import { filterCollectionProducts } from "@/lib/commerce/collections-engine";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string; collectionSlug: string }>;
}) {
  const { slug, collectionSlug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 100 }),
  ]);
  const defined = store.collections.find((c) => c.slug === collectionSlug);
  const category = catalog.categories.find(
    (c) => slugify(c.name) === collectionSlug,
  );
  const title = defined?.title || category?.name;
  if (!title) notFound();
  const products = defined
    ? (filterCollectionProducts(
        catalog.items,
        defined.collectionType === "automated" ? defined.rules : [],
        defined.sourceCategory || "all",
      ) as typeof catalog.items)
    : category
      ? catalog.items.filter((p) => slugify(p.category || "") === collectionSlug)
      : catalog.items;
  return (
    <>
      <CommerceTracker
        slug={slug}
        type="page_view"
        path={`/store/${slug}/collections/${collectionSlug}`}
      />
      <CatalogView
        slug={slug}
        store={store}
        products={products}
        categories={catalog.categories}
        title={title}
      />
    </>
  );
}
