"use client";

import { useState } from "react";
import Link from "next/link";
import { storePath, type StoreConfig } from "@/lib/commerce/schema";
import { THEMES } from "@/lib/commerce/themes";
import { storeCopy } from "@/lib/commerce/i18n";
import { CartButton } from "@/app/store/[slug]/cart";
import { ThemeToggle } from "@/components/shell/ThemeToggle";

export function StoreChrome({
  slug,
  store,
  businessName,
  showPlatformBranding = true,
  children,
}: {
  slug: string;
  store: StoreConfig;
  businessName: string;
  /** When false (Business+), hide "Powered by MyPoz" footer line. */
  showPlatformBranding?: boolean;
  children: React.ReactNode;
}) {
  const t = storeCopy(store.locale);
  const theme = THEMES[store.themeId];
  const name = store.name || businessName;
  const [open, setOpen] = useState(false);
  const headerStyle = theme.tokens.headerStyle;
  const editorial = headerStyle === "editorial";
  const transparent = headerStyle === "transparent";
  const shopLinks = store.navigation.slice(0, 6);
  const policy = store.footerLinks;

  return (
    <>
      {store.announcement ? (
        <div className="store-announce px-4 py-2 text-center text-[11px] font-semibold tracking-wide">
          {store.announcement}
        </div>
      ) : null}

      <header
        className={`store-chrome sticky top-0 z-30 border-b border-line ${
          transparent ? "bg-surface-1/70 backdrop-blur-md" : "bg-surface-1"
        }`}
      >
        <div
          className={`mx-auto flex items-center gap-4 px-4 py-3 lg:px-8 ${
            editorial ? "flex-col py-5" : "justify-between"
          }`}
          style={{ maxWidth: "var(--mp-max)" }}
        >
          <div className={`flex w-full items-center gap-3 ${editorial ? "justify-center" : ""}`}>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center border border-line md:hidden"
              style={{ borderRadius: "var(--mp-radius)" }}
              aria-expanded={open}
              aria-label={t.menu}
              onClick={() => setOpen((v) => !v)}
            >
              <span aria-hidden>{open ? "×" : "☰"}</span>
            </button>
            <Link href={storePath(slug)} className="flex min-w-0 items-center gap-3">
              {store.tokens.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.tokens.logoUrl} alt="" className="h-9 w-9 object-cover" />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent text-lg font-bold text-accent-ink"
                  style={{ borderRadius: "var(--mp-radius)" }}
                >
                  {name.charAt(0)}
                </span>
              )}
              <span className="min-w-0">
                <span
                  className={`block truncate leading-tight text-text-strong ${
                    editorial
                      ? "text-xl font-normal tracking-[0.18em] uppercase"
                      : "text-base font-semibold sm:text-lg"
                  }`}
                >
                  {name}
                </span>
                {!editorial && (
                  <span className="hidden text-xs text-text-dim sm:block">
                    Official store
                  </span>
                )}
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <ThemeToggle compact />
              <CartButton />
            </div>
          </div>

          <nav
            aria-label="Store"
            className={`hidden items-center gap-1 md:flex ${editorial ? "justify-center" : ""}`}
          >
            {shopLinks.map((item) => (
              <Link
                key={item.id}
                href={storePath(slug, item.href)}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-dim hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={storePath(slug, "collections")}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-dim hover:text-accent"
            >
              {t.collections}
            </Link>
          </nav>

          <div className={`hidden items-center gap-2 md:flex ${editorial ? "w-full justify-center" : ""}`}>
            <form action={storePath(slug, "search")} method="get" className="store-search hidden lg:block">
              <label className="sr-only" htmlFor="store-q">
                {t.search}
              </label>
              <input
                id="store-q"
                name="q"
                type="search"
                placeholder={t.searchPlaceholder}
                className="min-h-10 w-56 border border-line bg-surface-0 px-3 text-sm outline-none focus:border-accent xl:w-72"
                style={{ borderRadius: "var(--mp-radius)" }}
              />
            </form>
            <Link
              href={storePath(slug, "account")}
              className="min-h-11 px-3 py-2 text-xs font-semibold text-text-dim hover:text-accent"
            >
              {t.account}
            </Link>
            <ThemeToggle compact />
            <CartButton />
          </div>
        </div>

        {open && (
          <div className="border-t border-line bg-surface-1 px-4 py-3 md:hidden">
            {shopLinks.map((item) => (
              <Link
                key={item.id}
                href={storePath(slug, item.href)}
                className="block py-2 text-sm font-medium text-text-strong"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={storePath(slug, "search")}
              className="block py-2 text-sm text-text-dim"
              onClick={() => setOpen(false)}
            >
              {t.search}
            </Link>
            <Link
              href={storePath(slug, "account")}
              className="block min-h-11 py-2 text-sm text-text-dim"
              onClick={() => setOpen(false)}
            >
              {t.account}
            </Link>
          </div>
        )}
      </header>

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <footer className="mt-16 border-t border-line bg-surface-1 px-4 py-12 text-sm text-text-dim lg:px-8">
        <div
          className="mx-auto grid gap-10 sm:grid-cols-2 lg:grid-cols-4"
          style={{ maxWidth: "var(--mp-max)" }}
        >
          <div>
            <p
              className={`text-text-strong ${
                editorial ? "tracking-[0.16em] uppercase" : "font-semibold"
              }`}
            >
              {name}
            </p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed">
              {store.description || "Live stock from the same counter."}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-strong">
              {t.collections}
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href={storePath(slug, "products")} className="hover:text-accent">
                  {t.allProducts}
                </Link>
              </li>
              {store.collections.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link
                    href={storePath(slug, `collections/${c.slug}`)}
                    className="hover:text-accent"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-strong">
              Help
            </p>
            <ul className="mt-3 space-y-2">
              {policy.map((l) => (
                <li key={l.id}>
                  <Link href={storePath(slug, l.href)} className="hover:text-accent">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-strong">
              {t.visitUs}
            </p>
            <p className="mt-3 text-xs leading-relaxed">
              {store.address || "Pickup at checkout."}
            </p>
            {store.contactPhone ? (
              <p className="mt-2 text-xs">{store.contactPhone}</p>
            ) : null}
            {store.social.instagram || store.social.facebook ? (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-strong">
                {t.follow}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              {store.social.instagram ? (
                <a href={store.social.instagram} className="hover:text-accent">
                  Instagram
                </a>
              ) : null}
              {store.social.facebook ? (
                <a href={store.social.facebook} className="hover:text-accent">
                  Facebook
                </a>
              ) : null}
              {store.social.whatsapp ? (
                <a
                  href={`https://wa.me/${store.social.whatsapp.replace(/\D/g, "")}`}
                  className="hover:text-accent"
                >
                  WhatsApp
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 text-center text-[11px]" style={{ maxWidth: "var(--mp-max)" }}>
          © {new Date().getFullYear()} {name}
          {showPlatformBranding ? `. ${t.poweredBy}` : "."}
        </p>
      </footer>
    </>
  );
}
