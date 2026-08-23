"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { ProductForm } from "@/components/products/ProductForm";
import { ProductImportExport } from "@/components/products/ProductImportExport";

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 250;

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const debounced = useDebounce(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (debounced) params.set("search", debounced);
    setLoading(true);
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setItems(json.data.items);
        setTotal(json.data.total);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(product: Product) {
    if (!confirm(`Delete "${product.name}"?`)) return;
    const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.error ?? "Delete failed");
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(product: Product) {
    setEditing(product);
    setFormOpen(true);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ModuleHeader
        title="Products"
        subtitle={`${total.toLocaleString()} products / services`}
        actions={
          <button
            onClick={openCreate}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
          >
            + Add product
          </button>
        }
      />

      <ProductImportExport onImported={load} />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by name, barcode or brand…"
        className="mt-4 w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
      />

      {loading && items.length === 0 ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No products match. Add one to get started.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <motion.article
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              className="flex flex-col rounded-xl border border-line bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-strong">
                      {p.name}
                    </p>
                  <p className="text-xs text-text-dim">
                    {p.id} · {p.category}
                    {p.barcodes[0] ? ` · ${p.barcodes[0]}` : ""}
                  </p>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.quantity <= 0
                      ? "bg-danger/15 text-danger"
                      : p.quantity <= 5
                        ? "bg-warn/15 text-warn"
                        : "bg-accent/15 text-accent"
                  }`}
                >
                  {p.quantity <= 0 ? "Out" : `${p.quantity} in stock`}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="font-semibold text-accent">
                    {formatMoney(p.salePrice)}
                  </p>
                  {p.wholesalePrice != null && (
                    <p className="text-xs text-text-dim">
                      W/S {formatMoney(p.wholesalePrice)}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEdit(p)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-text-dim transition hover:border-accent hover:text-accent"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-text-dim transition hover:border-danger hover:text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between text-sm text-text-dim">
          <p>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}
          </p>
          <div className="flex gap-2">
            <PagerButton
              label="Previous"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            />
            <span className="px-2 py-1">
              Page {page} of {pageCount}
            </span>
            <PagerButton
              label="Next"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            />
          </div>
        </div>
      )}

      <ProductForm
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-line px-3 py-1.5 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
