"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HQ_NAV } from "@/lib/hq";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function HqShell({
  children,
  identityLabel,
}: {
  children: React.ReactNode;
  identityLabel: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    if (isSupabaseEnabled) {
      await createClient().auth.signOut();
    } else {
      await fetch("/api/auth/login", { method: "DELETE" });
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-1/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/hq" className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-xs font-bold text-accent-ink"
            >
              G
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-strong">
                Grabber Mobility Solutions
              </p>
              <p className="truncate text-[11px] text-text-dim">HQ · fleet portal</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-text-dim sm:inline">
              {identityLabel}
            </span>
            <Link
              href="/"
              className="rounded-xl px-3 py-1.5 text-sm text-text-dim transition hover:bg-surface-2 hover:text-text-strong"
            >
              Tenant app
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl px-3 py-1.5 text-sm text-text-dim transition hover:bg-surface-2 hover:text-text-strong"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav
          aria-label="HQ"
          className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6"
        >
          {HQ_NAV.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm transition ${
                  active
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-text-dim hover:bg-surface-2 hover:text-text-strong"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
