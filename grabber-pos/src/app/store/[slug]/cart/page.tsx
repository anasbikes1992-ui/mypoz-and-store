import { CartPageView } from "@/components/commerce/storefront/CartPageView";
import { getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { readWebsite } from "@/lib/server/website-store";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function StoreCartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();

  const [website, store] = await Promise.all([
    readWebsite(),
    readPublishedStore(),
  ]);

  return (
    <CartPageView
      slug={slug}
      locale={store.locale}
      businessName={info.businessName}
      currency={store.currency}
      whatsappNumber={
        store.social.whatsapp || website.whatsappNumber || info.whatsappNumber
      }
    />
  );
}
