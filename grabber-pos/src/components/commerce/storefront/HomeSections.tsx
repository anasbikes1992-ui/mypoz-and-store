"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/format";
import type { StoreProduct } from "@/lib/storefront";
import {
  storePath,
  type CardStyle,
  type StoreConfig,
  type StoreSection,
} from "@/lib/commerce/schema";
import { THEMES } from "@/lib/commerce/themes";
import { storeCopy } from "@/lib/commerce/i18n";
import { AddToCartButton } from "@/app/store/[slug]/cart";

function str(settings: Record<string, unknown>, key: string, fallback = ""): string {
  const v = settings[key];
  return typeof v === "string" ? v : fallback;
}

function num(settings: Record<string, unknown>, key: string, fallback: number): number {
  const v = settings[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function href(slug: string, value: string): string {
  if (!value || value === "home") return storePath(slug);
  if (value === "whatsapp") return "#whatsapp";
  if (value.startsWith("http") || value.startsWith("mailto:") || value.startsWith("tel:")) {
    return value;
  }
  return storePath(slug, value);
}

export function ProductCard({
  slug,
  product,
  style,
  t,
}: {
  slug: string;
  product: StoreProduct;
  style: CardStyle;
  t: ReturnType<typeof storeCopy>;
}) {
  const inStock = product.stock > 0;
  const imageFirst = style === "image-first" || style === "luxury";
  const dense = style === "dense" || style === "compact";

  return (
    <article
      className={`group flex flex-col overflow-hidden border border-line bg-surface-1 ${
        style === "luxury" ? "bg-transparent border-0" : ""
      }`}
      style={{ borderRadius: style === "luxury" || style === "minimal" ? 0 : "var(--mp-radius)" }}
    >
      <Link href={storePath(slug, `products/${product.slug}`)} className="block">
        <div
          className={`relative overflow-hidden bg-surface-2 ${
            imageFirst ? "aspect-[4/5]" : dense ? "aspect-square" : "aspect-[4/5]"
          }`}
        >
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              width={600}
              height={750}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-end p-4 text-4xl font-semibold text-text-dim/40">
              {product.name.slice(0, 1)}
            </div>
          )}
          {!inStock ? (
            <span className="absolute left-3 top-3 rounded-full bg-surface-1/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-text-dim">
              {t.outOfStock}
            </span>
          ) : product.compareAtPrice && product.compareAtPrice > product.price ? (
            <span className="absolute left-3 top-3 bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-ink">
              {t.sale}
            </span>
          ) : null}
        </div>
      </Link>
      <div className={`flex flex-1 flex-col gap-1 ${dense ? "p-2.5" : "p-3.5"}`}>
        {product.brand ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            {product.brand}
          </p>
        ) : null}
        <Link
          href={storePath(slug, `products/${product.slug}`)}
          className={`font-medium text-text-strong ${dense ? "text-xs line-clamp-2" : "text-sm line-clamp-2"}`}
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <p className="flex items-baseline gap-2">
                <span className="font-semibold tabular-nums text-text-strong">
                  {formatMoney(product.price)}
                </span>
                <span className="text-xs tabular-nums text-text-dim line-through">
                  {formatMoney(product.compareAtPrice)}
                </span>
              </p>
            ) : (
              <p className={`font-semibold tabular-nums ${style === "luxury" ? "text-sm tracking-wide" : "text-sm"} text-text-strong`}>
                {formatMoney(product.price)}
              </p>
            )}
          </div>
          <AddToCartButton
            productId={product.id}
            name={product.name}
            price={product.price}
            inStock={inStock}
          />
        </div>
      </div>
    </article>
  );
}

export function SectionView({
  slug,
  store,
  section,
  products,
  categories,
}: {
  slug: string;
  store: StoreConfig;
  section: StoreSection;
  products: StoreProduct[];
  categories: { name: string; count: number }[];
}) {
  if (!section.enabled) return null;
  const s = section.settings;
  const theme = THEMES[store.themeId];
  const t = storeCopy(store.locale);
  const card = store.tokens.cardStyle || theme.tokens.cardStyle;
  const count = Math.min(Math.max(num(s, "productCount", 8), 2), 24);
  const featured = products.slice(0, count);

  switch (section.type) {
    case "announcement": {
      const message = str(s, "message", store.announcement);
      if (!message || message === store.announcement) return null;
      return (
        <div className="bg-accent px-4 py-2 text-center text-xs font-semibold tracking-wide text-accent-ink">
          {str(s, "link") ? (
            <Link href={href(slug, str(s, "link"))}>{message}</Link>
          ) : (
            message
          )}
        </div>
      );
    }
    case "hero": {
      const heading = str(s, "heading", "Welcome to your new online store");
      const sub = str(s, "subheading", "Start selling online with MyPoz.");
      const cta = str(s, "ctaLabel", t.shopNow);
      const height =
        str(s, "height", "regular") === "tall"
          ? "min-h-[32rem] sm:min-h-[38rem]"
          : str(s, "height") === "compact"
            ? "min-h-[18rem]"
            : "min-h-[22rem] sm:min-h-[28rem]";
      const align = str(s, "alignment", theme.tokens.heroStyle === "fullbleed" ? "center" : "left");
      const image = str(s, "image");
      const fullbleed = theme.tokens.heroStyle === "fullbleed";

      return (
        <section
          className={`relative overflow-hidden border-b border-line ${height} ${
            fullbleed ? "flex items-end" : ""
          }`}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(900px_400px_at_90%_10%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_60%)]"
            />
          )}
          {image ? (
            <div
              className="absolute inset-0 bg-black/40"
              style={{ opacity: num(s, "overlay", 40) / 100 }}
            />
          ) : null}
          <div
            className={`relative mx-auto flex w-full flex-col gap-4 px-4 py-14 sm:py-20 lg:px-8 ${
              align === "center" ? "items-center text-center" : "items-start text-left"
            }`}
            style={{ maxWidth: "var(--mp-max)" }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {store.name}
            </p>
            <h1
              className={`max-w-3xl font-semibold tracking-tight text-text-strong ${
                fullbleed ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl"
              } ${image ? "text-white" : ""}`}
            >
              {heading}
            </h1>
            <p className={`max-w-xl text-sm leading-relaxed sm:text-base ${image ? "text-white/85" : "text-text-dim"}`}>
              {sub}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={href(slug, str(s, "ctaHref", "products"))}
                className="inline-flex min-h-11 items-center rounded-[var(--mp-radius)] bg-accent px-5 text-sm font-semibold text-accent-ink"
              >
                {cta}
              </Link>
              {str(s, "secondaryCtaLabel") ? (
                <Link
                  href={href(slug, str(s, "secondaryCtaHref", "products"))}
                  className="inline-flex min-h-11 items-center rounded-[var(--mp-radius)] border border-line bg-surface-1/80 px-5 text-sm font-semibold text-text-strong"
                >
                  {str(s, "secondaryCtaLabel")}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      );
    }
    case "featured_collection":
    case "product_grid": {
      const cols =
        store.themeId === "market" || store.themeId === "food"
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : store.themeId === "luxury"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-2 lg:grid-cols-4";
      return (
        <section className="mx-auto w-full px-4 py-10 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-text-strong sm:text-2xl">
              {str(s, "title", t.allProducts)}
            </h2>
            <Link href={storePath(slug, "products")} className="text-sm font-medium text-accent">
              {t.shopNow}
            </Link>
          </div>
          {featured.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-text-dim">
              {t.emptyProducts}
            </p>
          ) : (
            <div className={`grid gap-3 sm:gap-4 ${cols}`}>
              {featured.map((p) => (
                <ProductCard key={p.id} slug={slug} product={p} style={card} t={t} />
              ))}
            </div>
          )}
        </section>
      );
    }
    case "categories": {
      if (categories.length === 0) return null;
      return (
        <section className="mx-auto w-full px-4 py-8 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-text-strong">
            {str(s, "title", "Shop by category")}
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.slice(0, 16).map((c) => (
              <Link
                key={c.name}
                href={storePath(slug, `collections/${encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, "-"))}`)}
                className="shrink-0 rounded-[var(--mp-radius)] border border-line bg-surface-1 px-4 py-3 text-sm font-medium text-text-strong"
              >
                {c.name}
                <span className="ml-2 text-xs text-text-dim">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      );
    }
    case "image_text": {
      const right = str(s, "imagePosition", "right") === "right";
      return (
        <section className="mx-auto grid w-full gap-8 px-4 py-12 lg:grid-cols-2 lg:items-center lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
          <div className={right ? "lg:order-1" : "lg:order-2"}>
            <div className="aspect-[4/3] overflow-hidden bg-surface-2" style={{ borderRadius: "var(--mp-radius)" }}>
              {str(s, "image") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={str(s, "image")} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-dim">
                  {store.name}
                </div>
              )}
            </div>
          </div>
          <div className={right ? "lg:order-2" : "lg:order-1"}>
            <h2 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
              {str(s, "heading", "Run your shop. Sell online.")}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-dim">
              {str(s, "description")}
            </p>
            {str(s, "ctaLabel") ? (
              <Link
                href={href(slug, str(s, "ctaHref", "products"))}
                className="mt-5 inline-flex min-h-11 items-center rounded-[var(--mp-radius)] bg-accent px-5 text-sm font-semibold text-accent-ink"
              >
                {str(s, "ctaLabel")}
              </Link>
            ) : null}
          </div>
        </section>
      );
    }
    case "promo_banner":
      return (
        <section className="mx-auto w-full px-4 py-6 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
          <div
            className="relative overflow-hidden bg-accent px-6 py-10 text-accent-ink sm:px-10"
            style={{ borderRadius: "var(--mp-radius)" }}
          >
            <h2 className="text-2xl font-semibold tracking-tight">{str(s, "heading", store.name)}</h2>
            {str(s, "ctaLabel") ? (
              <Link
                href={href(slug, str(s, "ctaHref", "products"))}
                className="mt-4 inline-flex min-h-10 items-center rounded-[var(--mp-radius)] bg-surface-1 px-4 text-sm font-semibold text-text-strong"
              >
                {str(s, "ctaLabel")}
              </Link>
            ) : null}
          </div>
        </section>
      );
    case "trust": {
      const items = (Array.isArray(s.items) ? s.items : []) as {
        title?: string;
        body?: string;
      }[];
      const fallback = [
        { title: "Cash on delivery", body: "Pay when you receive" },
        { title: "Islandwide delivery", body: "We deliver across Sri Lanka" },
        { title: "Secure checkout", body: "Confirmed in MyPoz" },
        { title: "Easy pickup", body: "Collect from the shop" },
      ];
      const list = items.length ? items : fallback;
      return (
        <section className="border-y border-line bg-surface-1">
          <div
            className="mx-auto grid w-full grid-cols-2 gap-px bg-line sm:grid-cols-4"
            style={{ maxWidth: "var(--mp-max)" }}
          >
            {list.slice(0, 4).map((item, i) => (
              <div key={i} className="bg-surface-1 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-text-strong">{item.title}</p>
                <p className="mt-1 text-xs text-text-dim">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "testimonials": {
      const quote = str(s, "quote", "Fast delivery and the same prices as the shop.");
      return (
        <section className="mx-auto w-full px-4 py-12 text-center lg:px-8" style={{ maxWidth: "40rem" }}>
          <blockquote className="text-lg font-medium leading-relaxed text-text-strong sm:text-xl">
            “{quote}”
          </blockquote>
          <p className="mt-3 text-sm text-text-dim">{str(s, "customer", "A MyPoz customer")}</p>
        </section>
      );
    }
    case "newsletter":
      return (
        <section className="mx-auto w-full px-4 py-12 lg:px-8" style={{ maxWidth: "36rem" }}>
          <h2 className="text-center text-xl font-semibold text-text-strong">
            {str(s, "heading", "Get new drops first")}
          </h2>
          <p className="mt-2 text-center text-sm text-text-dim">
            {str(s, "description", "No spam. Unsubscribe any time.")}
          </p>
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => e.preventDefault()}
            aria-label="Newsletter"
          >
            <label className="sr-only" htmlFor={`nl-${section.id}`}>
              Email
            </label>
            <input
              id={`nl-${section.id}`}
              type="email"
              required
              placeholder="you@email.com"
              className="min-h-11 flex-1 border border-line bg-surface-1 px-3 text-sm outline-none focus:border-accent"
              style={{ borderRadius: "var(--mp-radius)" }}
            />
            <button
              type="submit"
              className="min-h-11 px-4 text-sm font-semibold bg-accent text-accent-ink"
              style={{ borderRadius: "var(--mp-radius)" }}
            >
              Join
            </button>
          </form>
        </section>
      );
    case "rich_text":
      return (
        <section className="mx-auto w-full px-4 py-12 lg:px-8" style={{ maxWidth: "42rem" }}>
          {str(s, "heading") ? (
            <h1 className="text-3xl font-semibold tracking-tight text-text-strong">
              {str(s, "heading")}
            </h1>
          ) : null}
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-text-dim">
            {str(s, "content")}
          </p>
        </section>
      );
    case "video":
      if (!str(s, "videoUrl")) return null;
      return (
        <section className="mx-auto w-full px-4 py-8 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
          <div className="aspect-video overflow-hidden bg-surface-2" style={{ borderRadius: "var(--mp-radius)" }}>
            <iframe
              src={str(s, "videoUrl")}
              title={str(s, "heading", "Video")}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      );
    case "spacer":
      return <div className="h-8 sm:h-12" aria-hidden />;
    case "brand_logos":
      return null;
    default:
      return null;
  }
}

export function HomeSections({
  slug,
  store,
  products,
  categories,
}: {
  slug: string;
  store: StoreConfig;
  products: StoreProduct[];
  categories: { name: string; count: number }[];
}) {
  const home = store.pages.find((p) => p.type === "home") ?? store.pages[0];
  const sections = home?.sections ?? [];
  return (
    <>
      {sections.map((section) => (
        <SectionView
          key={section.id}
          slug={slug}
          store={store}
          section={section}
          products={products}
          categories={categories}
        />
      ))}
    </>
  );
}
