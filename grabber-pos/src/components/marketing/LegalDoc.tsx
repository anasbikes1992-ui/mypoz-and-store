import type { ReactNode } from "react";
import Link from "next/link";

export function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="theme-marketing min-h-screen bg-surface-0 text-text-body">
      <header className="border-b border-line px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/welcome" className="text-sm font-semibold text-text-strong">
            MyPoz Commerce Cloud
          </Link>
          <Link href="/login" className="text-sm text-accent hover:underline">
            Sign in
          </Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold text-text-strong">{title}</h1>
        <p className="mt-2 text-xs text-text-dim">Last updated 18 August 2026</p>
        <div className="mt-8 space-y-5 text-sm leading-6">{children}</div>
      </article>
    </div>
  );
}
