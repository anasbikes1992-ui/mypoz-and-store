"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatMoney, formatDate, expiryStatus } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

const PAGE_SIZE = 40;
const SEARCH_DEBOUNCE_MS = 250;

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const debounced = useDebounce(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (debounced) params.set("search", debounced);
    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        setItems(json.data.items);
        setTotal(json.data.total);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [debounced, page]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ModuleHeader
        title="Inventory"
        subtitle={`${total.toLocaleString()} products`}
        actions={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, barcode, brand…"
            className="w-72 rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
          />
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-6 overflow-x-auto rounded-xl border border-line bg-surface-1"
      >
        <table className="w-full min-w-175 text-sm" aria-label="Inventory stock levels">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-text-dim">
              <th className="px-5 py-3.5 font-medium">Product</th>
              <th className="px-4 py-3.5 font-medium">Category</th>
              <th className="px-4 py-3.5 text-right font-medium">Cost</th>
              <th className="px-4 py-3.5 text-right font-medium">Price</th>
              <th className="px-4 py-3.5 text-right font-medium">Stock</th>
              <th className="px-5 py-3.5 font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((p) => {
              const exp = expiryStatus(p.expireDate);
              return (
                <tr key={p.id} className="transition-colors hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <p className="font-medium text-text-strong">{p.name}</p>
                    <p className="text-xs text-text-dim">
                      {p.barcodes[0] ?? "no barcode"}
                      {p.supplier ? ` · ${p.supplier}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-text-dim">{p.category}</td>
                  <td className="px-4 py-3 text-right text-text-dim">
                    {formatMoney(p.costPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-text-body">
                    {formatMoney(p.salePrice)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      p.quantity <= 0
                        ? "text-danger"
                        : p.quantity <= 5
                          ? "text-warn"
                          : "text-text-body"
                    }`}
                  >
                    {p.quantity}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        exp === "expired"
                          ? "text-danger"
                          : exp === "expiring"
                            ? "text-warn"
                            : "text-text-dim"
                      }
                    >
                      {formatDate(p.expireDate)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>

      <div className="mt-5 flex items-center justify-between text-sm text-text-dim">
        <p>
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-2">
          <PagerButton
            label="Previous"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          />
          <PagerButton
            label="Next"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          />
        </div>
      </div>
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
      className="rounded-lg border border-line px-4 py-2 transition hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-text-dim"
    >
      {label}
    </button>
  );
}
