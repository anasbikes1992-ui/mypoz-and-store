"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Barcode } from "@/components/barcode/Barcode";

interface LabelItem {
  product: Product;
  count: number;
}

export default function BarcodePage() {
  const [items, setItems] = useState<LabelItem[]>([]);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [template, setTemplate] = useState<"40x30" | "50x25" | "58x40">("40x30");

  function addProduct(p: Product) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === p.id);
      if (existing) return prev;
      return [...prev, { product: p, count: 1 }];
    });
  }

  function addMany(products: Product[]) {
    setItems((prev) => {
      const next = [...prev];
      for (const p of products) {
        if (!next.some((i) => i.product.id === p.id)) {
          next.push({ product: p, count: 1 });
        }
      }
      return next;
    });
  }

  function setCount(id: string, count: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === id ? { ...i, count: Math.max(1, count) } : i,
      ),
    );
  }
  function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== id));
  }

  const labels = items.flatMap((i) =>
    Array.from({ length: i.count }, () => i.product),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="print:hidden">
        <ModuleHeader
          title="Barcode labels"
          subtitle="Design and print product barcode labels"
          actions={
            <button
              onClick={() => window.print()}
              disabled={labels.length === 0}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
            >
              Print {labels.length > 0 ? `(${labels.length})` : ""}
            </button>
          }
        />

        <ProductPicker onPick={addProduct} onPickMany={addMany} />

        <fieldset className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-dim">
          <legend className="sr-only">Label display options</legend>
          <label className="flex items-center gap-2">
            Template
            <select
              value={template}
              onChange={(e) =>
                setTemplate(e.target.value as "40x30" | "50x25" | "58x40")
              }
              className="rounded border border-line bg-surface-1 px-2 py-1 text-text-strong"
            >
              <option value="40x30">40×30 mm</option>
              <option value="50x25">50×25 mm</option>
              <option value="58x40">58×40 mm</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showName}
              onChange={(e) => setShowName(e.target.checked)}
            />
            Show name
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
            />
            Show price
          </label>
        </fieldset>

        {items.length > 0 && (
          <div className="mt-4 space-y-2">
            {items.map((i) => (
              <div
                key={i.product.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm"
              >
                <span className="text-text-strong">{i.product.name}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-text-dim">
                    Labels
                    <input
                      type="number"
                      min={1}
                      value={i.count}
                      onChange={(e) =>
                        setCount(i.product.id, Number(e.target.value) || 1)
                      }
                      className="w-16 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                    />
                  </label>
                  <button
                    onClick={() => remove(i.product.id)}
                    className="text-text-dim transition hover:text-danger"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Print sheet */}
      {labels.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim print:hidden">
          Add products above to build a label sheet.
        </p>
      ) : (
        <div
          className={`label-sheet mt-6 grid gap-2 print:gap-1 ${
            template === "50x25"
              ? "grid-cols-3 sm:grid-cols-4 print:grid-cols-4"
              : template === "58x40"
                ? "grid-cols-2 sm:grid-cols-3 print:grid-cols-3"
                : "grid-cols-3 sm:grid-cols-4 print:grid-cols-4"
          }`}
        >
          {labels.map((p, idx) => (
            <div
              key={p.id + idx}
              className={`label flex flex-col items-center justify-center rounded border border-line bg-white text-center text-black ${
                template === "40x30"
                  ? "label-size-40x30 min-h-[30mm] w-[40mm] p-1"
                  : template === "50x25"
                    ? "label-size-50x25 min-h-[25mm] w-[50mm] p-1"
                    : "label-size-58x40 min-h-[40mm] w-[58mm] p-2"
              }`}
            >
              {showName && (
                <p
                  className={`line-clamp-1 w-full font-medium ${
                    template === "58x40" ? "text-xs" : "text-[10px]"
                  }`}
                >
                  {p.name}
                </p>
              )}
              <Barcode value={p.barcodes[0] || p.id} />
              {showPrice && (
                <p
                  className={`font-semibold ${
                    template === "58x40" ? "text-sm" : "text-xs"
                  }`}
                >
                  {formatMoney(p.salePrice)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPicker({
  onPick,
  onPickMany,
}: {
  onPick: (p: Product) => void;
  onPickMany: (products: Product[]) => void;
}) {
  const [mode, setMode] = useState<"search" | "browse">("search");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [browse, setBrowse] = useState<Product[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [browseFilter, setBrowseFilter] = useState("");
  const debounced = useDebounce(q, 200);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/products?search=${encodeURIComponent(debounced)}&pageSize=8`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((j) => j.success && setResults(j.data.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    if (mode !== "browse") return;
    fetch("/api/products?pageSize=100")
      .then((r) => r.json())
      .then((j) => j.success && setBrowse(j.data.items))
      .catch(() => undefined);
  }, [mode]);

  const visible = useMemo(() => {
    const term = browseFilter.trim().toLowerCase();
    if (!term) return browse;
    return browse.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.barcodes.some((b) => b.toLowerCase().includes(term)) ||
        p.id.toLowerCase().includes(term),
    );
  }, [browse, browseFilter]);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const p of visible) next.add(p.id);
      return next;
    });
  }

  function clearSelection() {
    setChecked(new Set());
  }

  function addSelected() {
    const selected = browse.filter((p) => checked.has(p.id));
    onPickMany(selected);
    clearSelection();
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode("search")}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
            mode === "search"
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-text-dim"
          }`}
        >
          Search to add
        </button>
        <button
          type="button"
          onClick={() => setMode("browse")}
          className={`rounded-lg border px-3 py-1.5 text-sm transition ${
            mode === "browse"
              ? "border-accent bg-accent/10 text-accent"
              : "border-line text-text-dim"
          }`}
        >
          Browse & select
        </button>
      </div>

      {mode === "search" ? (
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a product to add labels…"
            className="w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 shadow-xl">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onPick(p);
                      setQ("");
                      setResults([]);
                    }}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition hover:bg-surface-3"
                  >
                    <span className="text-text-strong">{p.name}</span>
                    <span className="text-xs text-text-dim">
                      {p.barcodes[0] || p.id}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={browseFilter}
              onChange={(e) => setBrowseFilter(e.target.value)}
              placeholder="Filter products…"
              className="min-w-[12rem] flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={selectAllVisible}
              className="rounded border border-line px-2.5 py-1.5 text-xs text-text-dim hover:text-accent"
            >
              Select all visible
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded border border-line px-2.5 py-1.5 text-xs text-text-dim hover:text-accent"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={checked.size === 0}
              onClick={addSelected}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-40"
            >
              Add selected ({checked.size})
            </button>
          </div>
          <ul className="mt-3 max-h-72 overflow-y-auto divide-y divide-line">
            {visible.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={checked.has(p.id)}
                    onChange={() => toggle(p.id)}
                  />
                  <span className="flex-1 text-text-strong">{p.name}</span>
                  <span className="text-xs text-text-dim">
                    {formatMoney(p.salePrice)}
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="py-6 text-center text-sm text-text-dim">
                No products match
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
