"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import type { StoreProduct } from "@/lib/storefront";
import type { WebsiteConfig } from "@/lib/website";
import { formatMoney } from "@/lib/format";
import { interactiveCard } from "@/lib/motion";
import { AddToCartButton } from "./cart";

interface Props {
  slug: string;
  businessName: string;
  website: WebsiteConfig;
  products: StoreProduct[];
  categories: { name: string; count: number }[];
  phone: string;
  currency: string;
}

export default function StorefrontClient({
  slug,
  businessName,
  website,
  products,
  categories,
  phone,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const reduced = useReducedMotion();
  const wa = (website.whatsappNumber || phone || "").replace(/[^0-9]/g, "");

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.brand || "").toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === "all" || p.category === selectedCat;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCat]);

  const announcement =
    website.announcementBar ||
    "Quality products · Fast local delivery · Best prices";

  return (
    <div className="font-sans">
      <div className="bg-gradient-to-r from-[var(--tint-teal)] to-[var(--accent)] px-4 py-2 text-center text-xs font-semibold tracking-wide text-white">
        {announcement}
      </div>

      {website.banners.length > 0 && (
        <section className="border-b border-line bg-surface-1">
          <div className="mx-auto flex max-w-7xl gap-3 overflow-x-auto px-4 py-4 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {website.banners.map((b, i) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt={b.alt || `Banner ${i + 1}`}
                  className="h-36 w-full max-w-xl shrink-0 rounded-2xl object-cover sm:h-44"
                />
              );
              return b.href ? (
                <a key={b.id} href={b.href} className="block shrink-0">
                  {img}
                </a>
              ) : (
                <div key={b.id} className="shrink-0">
                  {img}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden border-b border-line bg-surface-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_280px_at_85%_20%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_60%),radial-gradient(500px_240px_at_10%_90%,color-mix(in_oklch,var(--tint-coral)_14%,transparent),transparent_55%)]"
        />
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto flex max-w-7xl flex-col gap-3 px-4 py-10 sm:py-14 lg:px-8"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tint-teal)]">
            Official online store
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-text-strong sm:text-4xl">
            {website.heroHeadline || businessName}
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-text-dim sm:text-base">
            {website.heroSubline ||
              "Shop our catalog with live stock from the POS. Choose pickup or delivery at checkout."}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-[color-mix(in_oklch,var(--tint-teal)_35%,var(--line))] bg-[color-mix(in_oklch,var(--tint-teal)_10%,transparent)] px-4 py-2 text-xs font-semibold text-[var(--tint-teal)] transition hover:bg-[color-mix(in_oklch,var(--tint-teal)_18%,transparent)]"
              >
                Order on WhatsApp
              </a>
            ) : null}
            <Link
              href={`/store/${slug}/account`}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-text-body transition hover:border-accent hover:text-accent"
            >
              My account
            </Link>
          </div>
        </motion.div>
      </section>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 lg:px-8">
        <div className="space-y-4">
          <div className="relative max-w-xl">
            <label htmlFor="store-search" className="sr-only">
              Search products
            </label>
            <input
              id="store-search"
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-line bg-surface-1 px-5 py-3.5 text-sm text-text-strong shadow-[var(--panel-shadow)] outline-none transition placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryChip
              active={selectedCat === "all"}
              onClick={() => setSelectedCat("all")}
              label={`All products (${products.length})`}
            />
            {categories.map((cat) => (
              <CategoryChip
                key={cat.name}
                active={selectedCat === cat.name}
                onClick={() => setSelectedCat(cat.name)}
                label={`${cat.name} (${cat.count})`}
              />
            ))}
          </div>
        </div>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-text-dim">
            Available items ({filteredProducts.length})
          </h2>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
            {filteredProducts.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                reduced={reduced}
                delay={reduced ? 0 : Math.min(i * 0.03, 0.3)}
              />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-surface-1 py-16 text-center text-sm text-text-dim">
              No products match your search.
            </div>
          )}
        </section>

        {website.about ? (
          <section className="rounded-2xl border border-line bg-surface-1 p-6">
            <h2 className="text-sm font-semibold text-text-strong">About us</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-dim">
              {website.about}
            </p>
          </section>
        ) : null}

        <SocialLinks website={website} />
      </main>
    </div>
  );
}

function SocialLinks({ website }: { website: WebsiteConfig }) {
  const links = [
    { href: website.socialFacebook, label: "Facebook" },
    { href: website.socialInstagram, label: "Instagram" },
    { href: website.socialTwitter, label: "X" },
    { href: website.socialTiktok, label: "TikTok" },
  ].filter((l) => l.href);
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-3 pb-4 text-xs">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-line px-3 py-1.5 font-semibold text-text-dim transition hover:border-accent hover:text-accent"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-accent text-accent-ink shadow-[0_4px_12px_-4px_color-mix(in_oklch,var(--accent)_45%,transparent)]"
          : "border border-line bg-surface-1 text-text-dim hover:border-accent hover:text-accent"
      }`}
    >
      {label}
    </button>
  );
}

function ProductCard({
  product,
  reduced,
  delay,
}: {
  product: StoreProduct;
  reduced: boolean | null;
  delay: number;
}) {
  const inStock = product.stock > 0;
  const cardMotion = interactiveCard(reduced);

  return (
    <motion.article
      {...cardMotion}
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex flex-col justify-between rounded-2xl border border-line bg-surface-1 p-3.5 shadow-[0_8px_28px_-14px_oklch(40%_0.04_250_/_0.35)] transition hover:border-[color-mix(in_oklch,var(--accent)_40%,var(--line))] hover:shadow-[0_14px_32px_-12px_oklch(40%_0.05_250_/_0.4)] sm:p-4"
    >
      <div className="space-y-2">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-28 w-full rounded-xl border border-line object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex h-28 items-center justify-center rounded-xl border border-line bg-surface-2 text-2xl font-semibold text-text-dim"
          >
            {product.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-text-strong">
          {product.name}
        </h3>
        <p className="font-mono text-[11px] text-text-dim">
          {product.brand || product.category || "SKU"}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-2 border-t border-line pt-3">
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wide text-text-dim">
            Price
          </span>
          <span className="text-sm font-bold text-[var(--tint-green)]">
            {formatMoney(product.price)}
          </span>
        </div>
        <AddToCartButton
          productId={product.id}
          name={product.name}
          price={product.price}
          inStock={inStock}
        />
      </div>
    </motion.article>
  );
}
