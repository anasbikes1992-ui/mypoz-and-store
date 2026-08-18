"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/types";
import { expiryStatus, formatMoney } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { EmptyState, SkeletonGrid } from "@/components/ui/EmptyState";

interface ProductGridProps {
  onPick: (product: Product) => void;
  /** Hide barcode emphasis; categories first. */
  categoryMode?: boolean;
}

interface CategoryInfo {
  name: string;
  count: number;
}

const SEARCH_DEBOUNCE_MS = 220;
const TOP_CATEGORIES = 12;

function fefoRank(p: Product): number {
  const s = expiryStatus(p.expireDate);
  if (s === "expired") return 0;
  if (s === "expiring") return 1;
  if (s === "ok") return 2;
  return 3;
}

export function ProductGrid({ onPick, categoryMode = false }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (category) params.set("category", category);
    setLoading(true);
    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setItems(json.data.items);
        setCategories(json.data.categories);
        setTotal(json.data.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedSearch, category]);

  const displayItems = useMemo(() => {
    if (!categoryMode) return items;
    return [...items].sort((a, b) => {
      const diff = fefoRank(a) - fefoRank(b);
      if (diff !== 0) return diff;
      const aDate = a.expireDate ?? "9999";
      const bDate = b.expireDate ?? "9999";
      return aDate.localeCompare(bDate);
    });
  }, [items, categoryMode]);

  /** Barcode scanners type + Enter: exact match adds instantly. */
  async function handleEnter() {
    const code = search.trim();
    if (!code) return;
    const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`);
    const json = await res.json();
    if (json.success && json.data) {
      onPick(json.data as Product);
      setSearch("");
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {!categoryMode && (
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="Scan barcode or search name / brand…"
          autoFocus
          aria-label="Product search"
          className="w-full rounded-xl border border-line bg-surface-1 px-5 py-3.5 text-text-strong outline-none transition focus:border-accent"
        />
      )}

      {categoryMode && (
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="Filter by name…"
          aria-label="Product filter"
          className="w-full rounded-xl border border-line bg-surface-1 px-5 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
        />
      )}

      <div className={`${categoryMode ? "mt-2" : "mt-3"} flex gap-2 overflow-x-auto pb-1`} role="toolbar" aria-label="Categories">
        <CategoryChip
          label={`All (${total})`}
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {categories.slice(0, TOP_CATEGORIES).map((c) => (
          <CategoryChip
            key={c.name}
            label={`${c.name} (${c.count})`}
            active={category === c.name}
            onClick={() => setCategory(category === c.name ? null : c.name)}
          />
        ))}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto pr-1">
        {loading && items.length === 0 ? (
          <SkeletonGrid count={8} />
        ) : !loading && items.length === 0 ? (
          <EmptyState
            title="No products match"
            body="Clear the search or pick another category. Import a catalog from Products if the shelf is empty."
          />
        ) : (
          <motion.div layout className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {displayItems.map((p) => {
                const expiry = expiryStatus(p.expireDate);
                const warnBorder =
                  expiry === "expired"
                    ? "border-danger/60 hover:border-danger"
                    : expiry === "expiring"
                      ? "border-warn/60 hover:border-warn"
                      : "border-line hover:border-accent/70";
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.16 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPick(p)}
                    className={`flex flex-col justify-between rounded-2xl border bg-surface-1/95 p-3.5 text-left transition-colors ${warnBorder}`}
                  >
                    <div>
                      <p className="line-clamp-2 text-sm font-medium text-text-strong">
                        {p.name}
                      </p>
                      {expiry === "expired" && (
                        <span className="mt-1 inline-block rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                          Expired
                        </span>
                      )}
                      {expiry === "expiring" && (
                        <span className="mt-1 inline-block rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-medium text-warn">
                          Expiring soon
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <p className="font-mono text-sm font-semibold text-accent">
                        {formatMoney(p.salePrice)}
                      </p>
                      <p
                        className={`text-xs ${
                          p.quantity <= 5 ? "text-warn" : "text-text-dim"
                        }`}
                      >
                        {p.quantity} left
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-xl border px-3.5 py-1.5 text-xs transition ${
        active
          ? "border-accent bg-accent font-semibold text-accent-ink"
          : "border-line bg-surface-1 text-text-dim hover:text-text-body"
      }`}
    >
      {label}
    </button>
  );
}
