import { CartPageView } from "@/components/commerce/storefront/CartPageView";
import { readPublishedStore } from "@/lib/server/commerce-store";

export default async function StoreCartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await readPublishedStore();
  return <CartPageView slug={slug} locale={store.locale} />;
}
