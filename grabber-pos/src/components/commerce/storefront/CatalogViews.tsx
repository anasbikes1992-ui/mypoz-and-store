"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import type { StoreProduct, StoreProductVariant } from "@/lib/storefront";
import { storePath, type StoreConfig } from "@/lib/commerce/schema";
import { THEMES } from "@/lib/commerce/themes";
import { storeCopy } from "@/lib/commerce/i18n";
import { findVariantByOptions, groupVariantOptions } from "@/lib/commerce/line-ids";
import { isProductBlockOn, productTemplateBlocks } from "@/lib/commerce/blocks";
import { ProductCard } from "./HomeSections";
import { AddToCartButton, useCart } from "@/app/store/[slug]/cart";
import { ProductShareButtons } from "./ProductShareButtons";

export function CatalogView({
  slug,
  store,
  products,
  categories,
  title,
  empty,
  initialSearch = "",
}: {
  slug: string;
  store: StoreConfig;
  products: StoreProduct[];
  categories: { name: string; count: number }[];
  title?: string;
  empty?: string;
  initialSearch?: string;
}) {
  const t = storeCopy(store.locale);
  const theme = THEMES[store.themeId];
  const card = store.tokens.cardStyle || theme.tokens.cardStyle;
  const [search, setSearch] = useState(initialSearch);
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      const matchC = cat === "all" || p.category === cat;
      return matchQ && matchC;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, search, cat, sort]);

  const cols =
    store.themeId === "market"
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : store.themeId === "luxury"
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-4";

  return (
    <div className="mx-auto w-full px-4 py-8 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
      <h1 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
        {title || t.allProducts}
      </h1>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="catalog-search">
          {t.search}
        </label>
        <input
          id="catalog-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.search}
          className="min-h-11 flex-1 border border-line bg-surface-1 px-4 text-sm outline-none focus:border-accent"
          style={{ borderRadius: "var(--mp-radius)" }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="min-h-11 border border-line bg-surface-1 px-3 text-sm"
          style={{ borderRadius: "var(--mp-radius)" }}
          aria-label="Sort"
        >
          <option value="name">Name</option>
          <option value="price-asc">Price · low</option>
          <option value="price-desc">Price · high</option>
        </select>
      </div>
      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setCat("all")}
          className={`shrink-0 border px-2.5 py-1.5 text-[11px] font-semibold ${
            store.themeId === "market" ? "rounded-[var(--mp-radius)]" : "rounded-full"
          } ${
            cat === "all" ? "border-accent bg-accent text-accent-ink" : "border-line text-text-dim"
          }`}
        >
          {t.allProducts} ({products.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setCat(c.name)}
            className={`shrink-0 border px-2.5 py-1.5 text-[11px] font-semibold ${
              store.themeId === "market" ? "rounded-[var(--mp-radius)]" : "rounded-full"
            } ${
              cat === c.name ? "border-accent bg-accent text-accent-ink" : "border-line text-text-dim"
            }`}
          >
            {c.name}
            <span className="ml-1 text-[10px] opacity-70">{c.count}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-text-dim">
          {empty || t.emptyProducts}
        </p>
      ) : (
        <div className={`mt-6 grid ${store.themeId === "market" ? "gap-2 sm:gap-2.5" : "gap-3 sm:gap-4"} ${cols}`}>
          {filtered.map((p) => (
            <ProductCard key={p.id} slug={slug} product={p} style={card} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductView({
  slug,
  store,
  product,
  related,
  variants = [],
}: {
  slug: string;
  store: StoreConfig;
  product: StoreProduct;
  related: StoreProduct[];
  variants?: StoreProductVariant[];
}) {
  const t = storeCopy(store.locale);
  const theme = THEMES[store.themeId];
  const card = store.tokens.cardStyle || theme.tokens.cardStyle;
  const { add, open } = useCart();
  const options = groupVariantOptions(variants);
  const [opt1, setOpt1] = useState(options.option1[0] ?? null);
  const [opt2, setOpt2] = useState(options.option2[0] ?? null);
  const [opt3, setOpt3] = useState(options.option3[0] ?? null);

  const selected =
    variants.length > 0
      ? findVariantByOptions(variants, { option1: opt1, option2: opt2, option3: opt3 })
      : null;
  const price = selected?.price ?? product.price;
  const compareAt = selected?.compareAtPrice ?? product.compareAtPrice;
  const image = selected?.imageUrl || product.imageUrl;
  const stock = selected ? selected.stock : product.stock;
  const inStock = stock > 0;
  const displayName = selected ? `${product.name} — ${selected.title}` : product.name;
  const waText = `Hi, I want to order ${displayName}\n${typeof window === "undefined" ? "" : window.location.href}`;
  const blocks = productTemplateBlocks(store);
  const show = (type: string) => isProductBlockOn(blocks, type);
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  return (
    <div className="mx-auto w-full px-4 py-8 lg:px-8" style={{ maxWidth: "var(--mp-max)" }}>
      <nav className="mb-6 text-xs text-text-dim" aria-label="Breadcrumb">
        <Link href={storePath(slug)} className="hover:text-accent">
          {store.name}
        </Link>
        <span className="px-1.5">/</span>
        <Link href={storePath(slug, "products")} className="hover:text-accent">
          {t.allProducts}
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-text-strong">{product.name}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-2">
        {show("product_gallery") ? (
        <div className="overflow-hidden bg-surface-2" style={{ borderRadius: "var(--mp-radius)" }}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product.name} width={900} height={1100} className="w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center text-6xl font-semibold text-text-dim/30">
              {product.name.slice(0, 1)}
            </div>
          )}
        </div>
        ) : <div />}
        <div>
          {product.brand ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-dim">
              {product.brand}
            </p>
          ) : null}
          {show("product_title") ? (
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text-strong">
            {product.name}
          </h1>
          ) : null}
          {product.nameLocal ? (
            <p className="mt-1 text-sm text-text-dim">{product.nameLocal}</p>
          ) : null}
          <div className="mt-4 flex items-baseline gap-3">
            {show("product_price") ? (
            <p className="text-2xl font-semibold tabular-nums text-text-strong">
              {formatMoney(price)}
            </p>
            ) : null}
            {show("compare_at_price") && compareAt && compareAt > price ? (
              <p className="text-sm text-text-dim line-through">{formatMoney(compareAt)}</p>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-text-dim">
            {inStock ? `${t.inStock} · ${stock}` : t.outOfStock}
          </p>

          {show("variant_selector") && options.option1.length > 0 ? (
            <OptionRow label="Option" values={options.option1} value={opt1} onChange={setOpt1} />
          ) : null}
          {show("variant_selector") && options.option2.length > 0 ? (
            <OptionRow label="Option" values={options.option2} value={opt2} onChange={setOpt2} />
          ) : null}
          {show("variant_selector") && options.option3.length > 0 ? (
            <OptionRow label="Option" values={options.option3} value={opt3} onChange={setOpt3} />
          ) : null}
          {variants.length > 0 && !selected ? (
            <p className="mt-2 text-sm text-danger">This combination is not available.</p>
          ) : null}

          {show("product_description") && product.description ? (
            <p className="mt-4 text-sm leading-relaxed text-text-dim">{product.description}</p>
          ) : null}
          {show("shipping_info") ? (
            <p className="mt-3 text-sm text-text-dim">Delivery fees are calculated at checkout from the same MyPoz zones as the counter.</p>
          ) : null}
          {show("trust_badges") ? (
            <p className="mt-2 text-xs text-text-dim">Live POS stock · Pickup or delivery · Cash on delivery available</p>
          ) : null}
          {show("share_buttons") && pageUrl ? (
            <ProductShareButtons
              title={product.name}
              url={pageUrl}
              whatsappNumber={store.social.whatsapp}
            />
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {show("add_to_cart") ? (
            <AddToCartButton
              productId={product.id}
              name={displayName}
              price={price}
              inStock={inStock && (variants.length === 0 || !!selected)}
              variantId={selected?.id ?? null}
            />
            ) : null}
            {show("buy_now") && inStock && (variants.length === 0 || selected) ? (
              <button
                type="button"
                onClick={() => {
                  add({
                    productId: product.id,
                    name: displayName,
                    price,
                    variantId: selected?.id ?? null,
                  });
                  open();
                }}
                className="min-h-10 rounded-[var(--mp-radius)] border border-line px-4 text-sm font-semibold text-text-strong"
              >
                {t.buyNow}
              </button>
            ) : null}
            {store.social.whatsapp ? (
              <a
                href={`https://wa.me/${store.social.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(waText)}`}
                className="inline-flex min-h-10 items-center rounded-[var(--mp-radius)] border border-line px-4 text-sm font-semibold"
                target="_blank"
                rel="noreferrer"
              >
                {t.orderWhatsApp}
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {show("related_products") && related.length > 0 ? (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-semibold text-text-strong">{t.related}</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} slug={slug} product={p} style={card} t={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function OptionRow({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-dim">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              value === v ? "bg-accent text-accent-ink" : "border border-line text-text-dim"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
