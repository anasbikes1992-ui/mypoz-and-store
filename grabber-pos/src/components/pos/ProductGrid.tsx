"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { expiryStatus, formatMoney } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { EmptyState, SkeletonGrid, SkeletonRows } from "@/components/ui/EmptyState";

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
const TOP_CATEGORIES = 8;
const PAGE_SIZE = 24;

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
  const searching = debouncedSearch.trim().length > 0;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("pageSize", String(PAGE_SIZE));
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

  const visibleCats = categories.slice(0, TOP_CATEGORIES);
  const extraCats = categories.slice(TOP_CATEGORIES);

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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {!categoryMode && (
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleEnter()}
          placeholder="Scan barcode or search…"
          autoFocus
          aria-label="Product search"
          className="pos-scan w-full shrink-0 border border-line bg-surface-1 px-4 py-3 font-mono text-sm text-text-strong outline-none focus:border-accent"
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
          className="w-full shrink-0 rounded-xl border border-line bg-surface-1 px-5 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
        />
      )}

      <div
        className={`${categoryMode ? "mt-2" : "mt-3"} flex shrink-0 items-center gap-2 overflow-x-auto pb-1`}
        role="toolbar"
        aria-label="Categories"
      >
        <CategoryChip
          label={`All (${total})`}
          active={category === null}
          onClick={() => setCategory(null)}
        />
        {visibleCats.map((c) => (
          <CategoryChip
            key={c.name}
            label={`${c.name} (${c.count})`}
            active={category === c.name}
            onClick={() => setCategory(category === c.name ? null : c.name)}
          />
        ))}
        {extraCats.length > 0 && (
          <label className="shrink-0">
            <span className="sr-only">More categories</span>
            <select
              aria-label="More categories"
              value={extraCats.some((c) => c.name === category) ? category ?? "" : ""}
              onChange={(e) => setCategory(e.target.value || null)}
              className="h-8 max-w-[9rem] shrink-0 rounded-xl border border-line bg-surface-1 px-2 text-xs text-text-dim outline-none focus:border-accent"
            >
              <option value="">More</option>
              {extraCats.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {loading && items.length === 0 ? (
          searching ? <SkeletonRows count={6} /> : <SkeletonGrid count={8} />
        ) : !loading && items.length === 0 ? (
          <EmptyState
            title="No products match"
            body="Clear the search or pick another category. Import a catalog from Products if the shelf is empty."
          />
        ) : searching ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface-1">
            {displayItems.map((p) => {
              const expiry = expiryStatus(p.expireDate);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-surface-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-strong">
                        {p.name}
                      </span>
                      {expiry === "expired" && (
                        <span className="text-[10px] font-medium text-danger">Expired</span>
                      )}
                      {expiry === "expiring" && (
                        <span className="text-[10px] font-medium text-warn">Expiring soon</span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-semibold text-accent">
                        {formatMoney(p.salePrice)}
                      </span>
                      <span
                        className={`text-[11px] ${
                          p.quantity <= 5 ? "text-warn" : "text-text-dim"
                        }`}
                      >
                        {p.quantity} left
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid pos-shelf">
            {displayItems.map((p) => {
              const expiry = expiryStatus(p.expireDate);
              const hue = Math.abs(hashHue(p.name)) % 360;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p)}
                  className="pos-shelf-card"
                  style={{ ["--shelf-ink" as string]: `oklch(62% 0.12 ${hue})` }}
                >
                  <div>
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug text-text-strong">
                      {p.name}
                    </p>
                    {expiry === "expired" && (
                      <span className="mt-1 inline-block text-[10px] font-medium text-danger">
                        Expired
                      </span>
                    )}
                    {expiry === "expiring" && (
                      <span className="mt-1 inline-block text-[10px] font-medium text-warn">
                        Expiring
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <p className="font-mono text-sm font-semibold tabular-nums text-text-strong">
                      {formatMoney(p.salePrice)}
                    </p>
                    <p
                      className={`font-mono text-[11px] tabular-nums ${
                        p.quantity <= 5 ? "text-warn" : "text-text-dim"
                      }`}
                    >
                      {p.quantity}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
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
      type="button"
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
