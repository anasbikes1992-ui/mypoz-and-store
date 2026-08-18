"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { MODULE_GROUPS, type ModuleTile } from "@/lib/modules";
import { useBrand } from "@/components/brand/BrandProvider";
import {
  fadeUp,
  staggerContainer,
  staggerItem,
  tileTint,
  springSnappy,
} from "@/lib/motion";

export function Launcher() {
  const { brand, enabledKeys, loading } = useBrand();
  const businessName = brand.businessName || "MyPoz";
  const reduced = useReducedMotion();
  const headerMotion = fadeUp(reduced, 0);

  let tintIndex = 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        {...headerMotion}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
            {businessName}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-text-dim">
            Choose a sale mode, a business tool, or open your online store.
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_55%,transparent)] transition duration-150 ease-out hover:bg-accent-strong sm:w-auto"
        >
          Open retail terminal
        </Link>
      </motion.div>

      {MODULE_GROUPS.map((group) => (
        <section key={group.label} className="mt-8 sm:mt-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-dim">
            {group.label}
          </h2>
          <motion.div
            variants={staggerContainer(reduced)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
            {group.tiles.map((tile) => {
              const tint = tileTint(tintIndex++);
              return (
                <Tile
                  key={tile.key}
                  tile={tile}
                  tint={tint}
                  locked={!loading && !enabledKeys.has(tile.key)}
                  reduced={!!reduced}
                />
              );
            })}
          </motion.div>
        </section>
      ))}
    </div>
  );
}

function Tile({
  tile,
  tint,
  locked,
  reduced,
}: {
  tile: ModuleTile;
  tint: string;
  locked: boolean;
  reduced: boolean;
}) {
  const active = tile.status === "active" && !locked;
  const initial = tile.title.slice(0, 1).toUpperCase();

  const inner = (
    <motion.div
      variants={staggerItem(reduced)}
      whileHover={
        active && !reduced ? { y: -3, transition: springSnappy } : undefined
      }
      whileTap={active && !reduced ? { scale: 0.98 } : undefined}
      className={`group relative flex h-full flex-col rounded-3xl border p-3.5 transition-colors duration-150 ease-out sm:p-5 ${
        active
          ? "cursor-pointer border-line/80 bg-surface-1/90 backdrop-blur-md hover:border-transparent hover:shadow-[0_12px_28px_-14px_oklch(0%_0_0_/_0.5)]"
          : "border-dashed border-line bg-surface-1/35"
      }`}
      style={
        active
          ? ({
              ["--tile-tint" as string]: tint,
            } as CSSProperties)
          : undefined
      }
    >
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background: `linear-gradient(145deg, color-mix(in oklch, ${tint} 14%, transparent), transparent 60%)`,
          }}
        />
      ) : null}
      <div className="relative flex items-start justify-between gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold sm:h-10 sm:w-10 ${
            active ? "" : "bg-surface-3 text-text-dim"
          }`}
          style={
            active
              ? {
                  background: `color-mix(in oklch, ${tint} 22%, transparent)`,
                  color: tint,
                }
              : undefined
          }
          aria-hidden
        >
          {initial}
        </span>
        {locked ? (
          <span className="rounded-lg bg-warn/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn sm:text-xs">
            Upgrade
          </span>
        ) : tile.status === "soon" ? (
          <span className="rounded-lg bg-surface-3 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-dim sm:text-xs">
            Soon
          </span>
        ) : null}
      </div>
      <p
        className={`relative mt-3 text-sm font-semibold tracking-tight sm:mt-4 sm:text-base ${active ? "text-text-strong" : "text-text-dim"}`}
      >
        {tile.title}
      </p>
      <p className="relative mt-0.5 text-[11px] leading-snug text-text-dim sm:text-xs">
        {tile.subtitle}
      </p>
      {active && (
        <span
          className="relative mt-2 text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:mt-3"
          style={{ color: tint }}
        >
          Open
        </span>
      )}
    </motion.div>
  );

  if (active && tile.href) {
    return (
      <Link
        href={tile.href}
        className="block h-full rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {inner}
      </Link>
    );
  }
  return <div className="h-full">{inner}</div>;
}
