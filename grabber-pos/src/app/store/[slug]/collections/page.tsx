import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getStorefrontCatalog, getStorefrontInfo } from "@/lib/server/storefront-repo";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { storePath } from "@/lib/commerce/schema";
import { slugify } from "@/lib/storefront";
import { CommerceTracker } from "@/components/commerce/storefront/CommerceTracker";

export default async function CollectionsIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const info = await getStorefrontInfo({ host, slug });
  if (!info) notFound();
  const [store, catalog] = await Promise.all([
    readPublishedStore(),
    getStorefrontCatalog({ host, slug }, { size: 1 }),
  ]);
  const fromCategories = catalog.categories.map((c) => ({
    title: c.name,
    slug: slugify(c.name),
    count: c.count,
  }));
  const defined = store.collections.map((c) => ({
    title: c.title,
    slug: c.slug,
    count: undefined as number | undefined,
  }));
  const seen = new Set<string>();
  const list = [...defined, ...fromCategories].filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
  return (
    <div className="mx-auto w-full px-4 py-10 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
      <CommerceTracker slug={slug} type="page_view" path={`/store/${slug}/collections`} />
      <h1 className="text-3xl font-semibold tracking-tight text-text-strong">Collections</h1>
      {list.length === 0 ? (
        <p className="mt-8 text-sm text-text-dim">No collections yet.</p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <li key={c.slug}>
              <Link
                href={storePath(slug, `collections/${c.slug}`)}
                className="block border border-line bg-surface-1 p-5 hover:border-accent"
                style={{ borderRadius: "var(--mp-radius)" }}
              >
                <p className="font-semibold text-text-strong">{c.title}</p>
                {typeof c.count === "number" ? (
                  <p className="mt-1 text-xs text-text-dim">{c.count} products</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
