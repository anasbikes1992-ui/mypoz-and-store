"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";

interface StockLine {
  productId: string;
  name: string;
  systemQty: number;
  countedQty: number;
}

interface Stocktake {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  postedAt: string | null;
  lines: {
    productId: string;
    name: string;
    systemQty: number;
    countedQty: number;
    variance: number;
  }[];
}

export default function StocktakePage() {
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<StockLine[]>([]);
  const [list, setList] = useState<Stocktake[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/stocktake")
      .then((r) => r.json())
      .then((j) => j.success && setList(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  function addProduct(p: Product) {
    setLines((prev) =>
      prev.some((l) => l.productId === p.id)
        ? prev
        : [
            ...prev,
            {
              productId: p.id,
              name: p.name,
              systemQty: p.quantity,
              countedQty: p.quantity,
            },
          ],
    );
  }

  async function create() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            countedQty: l.countedQty,
          })),
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Failed" });
        return;
      }
      setMsg({ ok: true, text: `${j.data.id} created (draft).` });
      setLines([]);
      setNote("");
      load();
    } finally {
      setPending(false);
    }
  }

  async function post(id: string) {
    const res = await fetch(`/api/stocktake/${id}/post`, { method: "POST" });
    const j = await res.json();
    setMsg(
      j.success
        ? { ok: true, text: `${id} posted — stock updated.` }
        : { ok: false, text: j.error ?? "Failed" },
    );
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Stocktake"
        subtitle="Count stock, then post variances"
      />

      <label className="mt-6 block text-sm">
        <span className="mb-1 block text-text-dim">Note</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
        />
      </label>

      <ProductPicker onPick={addProduct} />

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-1">
        {lines.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-dim">
            Search and add products to count.
          </p>
        ) : (
          <table className="w-full text-sm" aria-label="Stocktake lines">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-text-dim">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">System</th>
                <th className="px-4 py-2.5 font-medium">Counted</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.productId}>
                  <td className="px-4 py-2.5 text-text-strong">{l.name}</td>
                  <td className="px-4 py-2.5 text-text-dim">{l.systemQty}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={l.countedQty}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x) =>
                            x.productId === l.productId
                              ? {
                                  ...x,
                                  countedQty: Math.max(
                                    0,
                                    Number(e.target.value) || 0,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                      className="w-24 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((x) => x.productId !== l.productId),
                        )
                      }
                      className="text-text-dim transition hover:text-danger"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {msg && (
        <p
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            msg.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <Button disabled={pending || lines.length === 0} onClick={create}>
          {pending ? "Saving…" : "Create worksheet"}
        </Button>
      </div>

      {list.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-text-strong">
            Stocktakes
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {list.map((st) => (
              <li
                key={st.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {st.id}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                        st.status === "posted"
                          ? "bg-accent/15 text-accent"
                          : "bg-warn/15 text-warn"
                      }`}
                    >
                      {st.status}
                    </span>
                  </p>
                  <p className="text-xs text-text-dim">
                    {formatDateTime(st.createdAt)} · {st.lines.length} lines
                    {st.note ? ` · ${st.note}` : ""}
                  </p>
                </div>
                {st.status === "draft" && (
                  <Button size="sm" variant="secondary" onClick={() => post(st.id)}>
                    Post
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ProductPicker({ onPick }: { onPick: (p: Product) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
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

  return (
    <div className="relative mt-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a product to count…"
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
                  qty {p.quantity} · {formatMoney(p.salePrice)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
