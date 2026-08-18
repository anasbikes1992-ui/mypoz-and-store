"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface-1/40 px-6 py-12 text-center">
      <p className="text-base font-semibold text-text-strong">{title}</p>
      {body ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-text-dim">{body}</p>
      ) : null}
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-xl border border-line bg-surface-2/80"
        />
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-5 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-xl border border-line bg-surface-2/80"
        />
      ))}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-surface-1/95 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)] ${className}`}
    >
      {children}
    </div>
  );
}
