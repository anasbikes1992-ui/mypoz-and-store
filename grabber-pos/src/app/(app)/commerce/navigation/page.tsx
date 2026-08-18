import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { readDraftStore } from "@/lib/server/commerce-store";
import { NavigationEditor } from "./NavigationEditor";

export default async function CommerceNavigationPage() {
  const store = await readDraftStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Navigation"
        subtitle="Header and footer menus — nested links, collections, and pages."
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      <div className="mt-6">
        <NavigationEditor
          navigation={store.navigation}
          footerLinks={store.footerLinks}
        />
      </div>
    </div>
  );
}
