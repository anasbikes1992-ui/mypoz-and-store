import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { MediaLibrary } from "@/components/commerce/admin/MediaLibrary";

export default function CommerceMediaPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Media library"
        subtitle="Upload product and theme images. Copy the URL onto a product — this is not a second catalogue."
      />
      <div className="mt-4">
        <CommerceNav />
      </div>
      <MediaLibrary />
    </div>
  );
}
