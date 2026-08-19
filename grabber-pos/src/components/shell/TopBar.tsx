"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useBrand } from "@/components/brand/BrandProvider";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { springSoft } from "@/lib/motion";

const QUICK_LINKS = [
  { href: "/", label: "Home" },
  { href: "/pos", label: "Sell" },
  { href: "/commerce", label: "Store" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sales", label: "Sales" },
] as const;

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { brand } = useBrand();
  const reduced = useReducedMotion();
  const [showHq, setShowHq] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-line text-sm md:hidden"
          aria-expanded={menuOpen}
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "×" : "☰"}
        </button>
        <div className="mr-0.5 hidden items-center gap-0.5 md:flex">
          {QUICK_LINKS.map((link) => {
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
          className="min-h-11 rounded-2xl border border-line px-3 py-1.5 text-sm text-text-dim transition duration-150 hover:border-danger/50 hover:text-danger"
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
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block min-h-11 py-2 text-sm font-medium text-text-strong"
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/billing"
          className="block min-h-11 py-2 text-sm text-text-dim"
          onClick={() => setMenuOpen(false)}
        >
          Billing
        </Link>
        <Link
          href="/observability"
          className="block min-h-11 py-2 text-sm text-text-dim"
          onClick={() => setMenuOpen(false)}
        >
          Session replay
        </Link>
      </nav>
    ) : null}
    </>
  );
}
