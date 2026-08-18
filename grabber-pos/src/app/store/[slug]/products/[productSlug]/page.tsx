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
import { jsonLd } from "@/lib/commerce/json-ld";
import { storeBaseUrl } from "@/lib/server/storefront-url";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const host = (await headers()).get("host");
  const product = await getStorefrontProduct({ host, slug }, productSlug);
  if (!product) return { title: "Product" };
  const store = await readPublishedStore();
  const title = product.seoTitle || product.name;
  const description =
    product.seoDescription ||
    product.description ||
    `${product.name} — live stock from ${store.name}`;
  const canonical = `${await storeBaseUrl(slug)}/products/${product.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      type: "website",
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
  const canonical = `${await storeBaseUrl(slug)}/products/${product.slug}`;
  const variants = await getStorefrontProductVariants({ host, slug }, product);
  const related = catalog.items
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 8);
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.imageUrl || undefined,
    sku: product.barcode || product.id,
    brand: { "@type": "Brand", name: product.brand || store.name },
    offers: {
      "@type": "Offer",
      url: canonical,
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
        dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdData) }}
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
