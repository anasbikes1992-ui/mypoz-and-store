import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { CollectionsAdmin } from "@/components/commerce/admin/CollectionsAdmin";
import { readDraftStore } from "@/lib/server/commerce-store";
import { getStorefrontCatalog } from "@/lib/server/storefront-repo";

export default async function CommerceCollectionsPage() {
  const store = await readDraftStore();
  const catalog = await getStorefrontCatalog({ host: null, slug: store.slug }, { size: 1 });
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Collections"
        subtitle="Smart rules filter the same POS catalogue. No second product list."
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      <CollectionsAdmin
        initial={store}
        categories={catalog.categories.map((c) => c.name)}
      />
    </div>
  );
}
