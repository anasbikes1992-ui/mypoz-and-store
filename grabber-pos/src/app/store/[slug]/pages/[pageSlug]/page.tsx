import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { SectionView } from "@/components/commerce/storefront/HomeSections";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string; pageSlug: string }>;
}) {
  const { slug, pageSlug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 12 }),
  ]);
  const page = store.pages.find((p) => p.slug === pageSlug && p.visible && p.type !== "home");
  if (!page) notFound();
  return (
    <>
      <CommerceTracker slug={slug} type="page_view" path={`/store/${slug}/pages/${pageSlug}`} />
      {page.sections.length === 0 ? (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="text-3xl font-semibold text-text-strong">{page.title}</h1>
        </div>
      ) : (
        page.sections.map((section) => (
          <SectionView
            key={section.id}
            slug={slug}
            store={store}
            section={section}
            products={catalog.items}
            categories={catalog.categories}
          />
        ))
      )}
    </>
  );
}
