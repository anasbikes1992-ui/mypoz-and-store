import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getStorefrontCatalog,
  getStorefrontInfo,
  getStorefrontProduct,
  getStorefrontProductVariants,
} from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { ProductView } from "@/components/commerce/storefront/CatalogViews";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const host = (await headers()).get("host");
  const product = await getStorefrontProduct({ host, slug }, productSlug);
  if (!product) return { title: "Product" };
  return {
    title: product.name,
    description: product.description || `${product.name} — ${product.price}`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, productSlug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, product, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontProduct({ host, slug }, productSlug),
    getStorefrontCatalog({ host, slug }, { size: 24 }),
  ]);
  if (!product) notFound();
  const variants = await getStorefrontProductVariants({ host, slug }, product);
  const related = catalog.items
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 8);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl || undefined,
    brand: product.brand || store.name,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: store.currency || "LKR",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CommerceTracker
        slug={slug}
        type="product_view"
        path={`/store/${slug}/products/${productSlug}`}
        productId={product.id}
      />
      <ProductView slug={slug} store={store} product={product} related={related} variants={variants} />
    </>
  );
}
