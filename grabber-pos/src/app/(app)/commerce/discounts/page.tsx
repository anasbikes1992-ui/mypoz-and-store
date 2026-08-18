import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { CollectionManager } from "@/components/collections/CollectionManager";

export default function CommerceDiscountsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <CommerceNav />
      <p className="mt-4 text-sm text-text-dim">
        Codes apply as a final discount on the same create_sale path used at the counter.
      </p>
      <div className="mt-4">
        <CollectionManager name="discount_codes" />
      </div>
    </div>
  );
}
