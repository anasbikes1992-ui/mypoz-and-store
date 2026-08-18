import type { MetadataRoute } from "next";
import { readSettings } from "@/lib/server/settings-store";
import { getStorefrontProductSlugs } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { storeBaseUrl } from "@/lib/server/storefront-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await readSettings();
  const store = await readPublishedStore();
  const slug = store.slug || settings.storeSlug || "main-store";
  const base = await storeBaseUrl(slug);
  const products = await getStorefrontProductSlugs({ host: null, slug });

  const urls: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  ];
  for (const c of store.collections) {
    urls.push({
      url: `${base}/collections/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }
  for (const p of products.slice(0, 500)) {
    urls.push({
      url: `${base}/products/${p.slug}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  return urls;
}
