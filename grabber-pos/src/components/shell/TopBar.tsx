"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useBrand } from "@/components/brand/BrandProvider";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { springSoft } from "@/lib/motion";

const QUICK_LINKS = [
  { href: "/", label: "Home", key: null },
  { href: "/pos", label: "Sell", key: "retail" },
  { href: "/commerce", label: "Store", key: "commerce" },
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/sales", label: "Sales", key: "sales" },
  { href: "/settings", label: "Settings", key: "settings" },
] as const;

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { brand, enabledKeys, loading } = useBrand();
  const reduced = useReducedMotion();
  const [showHq, setShowHq] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const links = useMemo(
    () =>
      QUICK_LINKS.filter((link) => {
        if (!link.key) return true;
        if (loading) return link.key === "retail" || link.key === "dashboard";
        return enabledKeys.has(link.key);
      }),
    [enabledKeys, loading],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hq/me")
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.success && j.data?.allowed) setShowHq(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function logout() {
    if (isSupabaseEnabled) {
      await createClient().auth.signOut();
    } else {
      await fetch("/api/auth/login", { method: "DELETE" });
    }
    router.push("/login");
    router.refresh();
  }

  const businessName = brand.businessName || "MyPoz";

  return (
    <>
      <motion.header
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0 } : springSoft}
        className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface-1/80 px-3 backdrop-blur-xl sm:gap-4 sm:px-5"
      >
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 rounded-xl transition duration-150 hover:opacity-90"
        >
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={`${businessName} logo`}
              className="h-8 w-8 rounded-xl object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-ink shadow-[0_2px_8px_-2px_color-mix(in_oklch,var(--accent)_50%,transparent)]"
            >
              G
            </span>
          )}
          <span className="truncate text-base font-semibold tracking-tight text-text-strong sm:text-lg">
            {businessName}
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-2xl border border-line text-sm md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
          <div className="mr-0.5 hidden items-center gap-0.5 md:flex">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-3 py-1.5 text-sm transition duration-150 ${
                    active
                      ? "bg-accent/15 font-medium text-accent"
                      : "text-text-dim hover:bg-surface-2 hover:text-text-strong"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          {showHq && (
            <Link
              href="/hq"
              className="rounded-2xl border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent transition duration-150 hover:bg-accent/10"
            >
              MyPoz HQ
            </Link>
          )}
          <Link
            href="/help"
            className="hidden min-h-11 items-center rounded-2xl border border-line px-3 py-1.5 text-sm text-text-dim transition duration-150 hover:border-accent hover:text-accent sm:inline-flex"
          >
            Help
          </Link>
          <ThemeToggle compact />
          <button
            type="button"
            onClick={logout}
            className="min-h-11 cursor-pointer rounded-2xl border border-line px-3 py-1.5 text-sm text-text-dim transition duration-150 hover:border-danger/50 hover:text-danger"
          >
            Sign out
          </button>
        </nav>
      </motion.header>
      {menuOpen ? (
        <nav
          aria-label="Mobile"
          className="border-b border-line bg-surface-1 px-3 py-2 md:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block min-h-11 py-2 text-sm font-medium text-text-strong"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {enabledKeys.has("billing") || loading ? (
            <Link
              href="/billing"
              className="block min-h-11 py-2 text-sm text-text-dim"
              onClick={() => setMenuOpen(false)}
            >
              Billing
            </Link>
          ) : null}
          <Link
            href="/help"
            className="block min-h-11 py-2 text-sm text-text-dim"
            onClick={() => setMenuOpen(false)}
          >
            Help
          </Link>
        </nav>
      ) : null}
    </>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
