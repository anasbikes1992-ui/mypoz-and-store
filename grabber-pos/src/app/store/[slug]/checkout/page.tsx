import { CheckoutPage } from "@/components/commerce/storefront/CheckoutPage";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { readWebsite } from "@/lib/server/website-store";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function StoreCheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();

  const [website, store] = await Promise.all([readWebsite(), readPublishedStore()]);

  return (
    <CheckoutPage
      slug={slug}
      businessName={info.businessName}
      currency={store.currency}
      locale={store.locale}
      website={website}
      store={store}
    />
  );
}
