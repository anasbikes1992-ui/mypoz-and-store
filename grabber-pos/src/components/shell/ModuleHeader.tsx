"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

interface ModuleHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Compact header for a module screen: back + home + title, optional actions. */
export function ModuleHeader({ title, subtitle, actions }: ModuleHeaderProps) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const motionProps = fadeUp(reduced, 0);

  return (
    <motion.div
      {...motionProps}
      className="flex flex-wrap items-end justify-between gap-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface-1/60 text-text-dim backdrop-blur-sm transition duration-150 hover:border-accent hover:text-accent"
          >
            ←
          </button>
          <Link
            href="/"
            aria-label="Home"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-line bg-surface-1/60 text-text-dim backdrop-blur-sm transition duration-150 hover:border-accent hover:text-accent"
          >
            ⌂
          </Link>
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-text-strong sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-text-dim">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </motion.div>
  );
}
