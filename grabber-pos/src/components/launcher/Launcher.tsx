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

  const groups = MODULE_GROUPS.map((group) => ({
    ...group,
    tiles: group.tiles.filter((tile) => {
      if (tile.status !== "active" || !tile.href) return false;
      // While license loads, show core retail only — avoid flashing every vertical.
      if (loading) {
        return (
          tile.key === "retail" ||
          tile.key === "products" ||
          tile.key === "dashboard" ||
          tile.key === "sales" ||
          tile.key === "commerce" ||
          tile.key === "settings"
        );
      }
      return enabledKeys.has(tile.key);
    }),
  })).filter((group) => group.tiles.length > 0);

  const canCommerce = loading || enabledKeys.has("commerce");
  const canPos = loading || enabledKeys.has("retail");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <motion.div
        {...headerMotion}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-strong sm:text-3xl">
            {businessName}
          </h1>
          <p className="mt-1 max-w-lg text-sm text-text-dim">
            Your activated tools — only what your plan includes.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canCommerce ? (
            <Link
              href="/commerce/onboarding"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl border border-line px-5 text-sm font-semibold text-text-strong transition duration-150 hover:border-accent hover:text-accent sm:w-auto"
            >
              Launch online store
            </Link>
          ) : null}
          {canPos ? (
            <Link
              href="/pos"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl bg-accent px-5 text-sm font-semibold text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_55%,transparent)] transition duration-150 ease-out hover:bg-accent-strong sm:w-auto"
            >
              Open retail terminal
            </Link>
          ) : null}
        </div>
      </motion.div>

      {groups.map((group) => (
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
  reduced,
}: {
  tile: ModuleTile;
  tint: string;
  reduced: boolean;
}) {
  const initial = tile.title.slice(0, 1).toUpperCase();

  const inner = (
    <motion.div
      variants={staggerItem(reduced)}
      whileHover={!reduced ? { y: -3, transition: springSnappy } : undefined}
      whileTap={!reduced ? { scale: 0.98 } : undefined}
      className="group relative flex h-full cursor-pointer flex-col rounded-3xl border border-line/80 bg-surface-1/90 p-3.5 backdrop-blur-md transition-colors duration-150 ease-out hover:border-transparent hover:shadow-[0_12px_28px_-14px_oklch(0%_0_0_/_0.5)] sm:p-5"
      style={
        {
          ["--tile-tint" as string]: tint,
        } as CSSProperties
      }
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(145deg, color-mix(in oklch, ${tint} 14%, transparent), transparent 60%)`,
        }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-semibold sm:h-10 sm:w-10"
          style={{
            background: `color-mix(in oklch, ${tint} 22%, transparent)`,
            color: tint,
          }}
          aria-hidden
        >
          {initial}
        </span>
      </div>
      <p className="relative mt-3 text-sm font-semibold tracking-tight text-text-strong sm:mt-4 sm:text-base">
        {tile.title}
      </p>
      <p className="relative mt-0.5 text-[11px] leading-snug text-text-dim sm:text-xs">
        {tile.subtitle}
      </p>
      <span
        className="relative mt-2 text-sm font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:mt-3"
        style={{ color: tint }}
      >
        Open
      </span>
    </motion.div>
  );

  return (
    <Link
      href={tile.href!}
      className="block h-full rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {inner}
    </Link>
  );
}
