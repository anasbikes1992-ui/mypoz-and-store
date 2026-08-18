import { StoreBuilder } from "@/components/commerce/builder/StoreBuilder";
import { readDraftStore } from "@/lib/server/commerce-store";
import { getStorefrontCatalog } from "@/lib/server/storefront-repo";

export default async function StoreBuilderPage() {
  const draft = await readDraftStore();
  const slug = draft.slug || "main-store";
  const catalog = await getStorefrontCatalog({ host: null, slug }, { size: 24 });
  return (
    <StoreBuilder
      initial={draft}
      products={catalog.items}
      categories={catalog.categories}
      slug={slug}
    />
  );
}
