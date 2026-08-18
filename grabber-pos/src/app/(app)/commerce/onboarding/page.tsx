import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { OnboardingWizard } from "@/components/commerce/admin/OnboardingWizard";
import { readDraftStore } from "@/lib/server/commerce-store";
import { storePath } from "@/lib/commerce/schema";

export default async function CommerceOnboardingPage() {
  const store = await readDraftStore();
  const storeUrl = storePath(store.slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Launch your online store"
        subtitle="Get a working MyPoz storefront in under 10 minutes — same products, inventory, and orders as your POS."
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      <div className="mt-8">
        <OnboardingWizard initial={store} storeUrl={storeUrl} />
      </div>
    </div>
  );
}
