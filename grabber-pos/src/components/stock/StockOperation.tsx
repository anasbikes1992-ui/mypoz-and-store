"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

type OpType = "grn" | "return" | "damage";

interface OpConfig {
  title: string;
  subtitle: string;
  partyLabel: string;
  showCost: boolean;
  verb: string;
  direction: "in" | "out";
}

const CONFIG: Record<OpType, OpConfig> = {
  grn: {
    title: "Goods Received (GRN)",
    subtitle: "Receive stock from a supplier",
    partyLabel: "Supplier",
    showCost: true,
    verb: "Receive stock",
    direction: "in",
  },
  return: {
    title: "Returns",
    subtitle: "Restock items returned by a customer",
    partyLabel: "Customer",
    showCost: false,
    verb: "Record return",
    direction: "in",
  },
  damage: {
    title: "Damages",
    subtitle: "Write off damaged or lost stock",
    partyLabel: "Reported by",
    showCost: false,
    verb: "Write off",
    direction: "out",
  },
};

interface Line {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface StockDocSummary {
  id: string;
  date: string;
  party: string | null;
  total: number;
  lines: Line[];
}

export function StockOperation({ type }: { type: OpType }) {
  const cfg = CONFIG[type];
  const [party, setParty] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [docs, setDocs] = useState<StockDocSummary[]>([]);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function loadDocs() {
    fetch(`/api/stock/${type}`)
      .then((r) => r.json())
      .then((j) => j.success && setDocs(j.data))
      .catch(() => undefined);
  }
  useEffect(loadDocs, [type]);

  function addProduct(p: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        { productId: p.id, name: p.name, quantity: 1, unitPrice: p.costPrice },
      ];
    });
  }

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.productId === id ? { ...l, ...patch } : l)),
    );
  }

  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  async function submit() {
    setMsg(null);
    setPending(true);
    try {
      const res = await fetch(`/api/stock/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party: party || undefined,
          reference: reference || undefined,
          note: note || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: cfg.showCost ? l.unitPrice : undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setMsg({ ok: false, text: json.error ?? "Failed" });
        return;
      }
      setMsg({ ok: true, text: `${json.data.id} saved — stock updated.` });
      setLines([]);
      setParty("");
      setReference("");
      setNote("");
      loadDocs();
    } catch {
      setMsg({ ok: false, text: "Could not reach the server" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={cfg.title}
        subtitle={cfg.subtitle}
        actions={
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              cfg.direction === "in"
                ? "bg-accent/15 text-accent"
                : "bg-warn/15 text-warn"
            }`}
          >
            Stock {cfg.direction === "in" ? "in ↑" : "out ↓"}
          </span>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <LabeledField label={cfg.partyLabel} value={party} onChange={setParty} />
        <LabeledField label="Reference" value={reference} onChange={setReference} />
        <LabeledField label="Note" value={note} onChange={setNote} />
      </div>

      <ProductPicker onPick={addProduct} />

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-1">
        {lines.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-dim">
            Search and add products above.
          </p>
        ) : (
          <table className="w-full text-sm" aria-label="Stock operation line items">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-text-dim">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Qty</th>
                {cfg.showCost && (
                  <th className="px-4 py-2.5 font-medium">Unit cost</th>
                )}
                <th className="px-4 py-2.5 text-right font-medium">Line</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.productId}>
                  <td className="px-4 py-2.5 text-text-strong">{l.name}</td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(l.productId, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-20 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                    />
                  </td>
                  {cfg.showCost && (
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        min={0}
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(l.productId, {
                            unitPrice: Number(e.target.value) || 0,
                          })
                        }
                        className="w-24 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-right text-text-body">
                    {formatMoney(l.unitPrice * l.quantity)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((x) => x.productId !== l.productId),
                        )
                      }
                      className="text-text-dim transition hover:text-danger"
                      aria-label="Remove"
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

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-text-dim">
          {cfg.showCost && lines.length > 0 && (
            <>Total value: <span className="text-text-strong">{formatMoney(total)}</span></>
          )}
        </p>
        <button
          onClick={submit}
          disabled={pending || lines.length === 0}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
        >
          {pending ? "Saving…" : cfg.verb}
        </button>
      </div>

      {docs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-text-strong">Recent</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">{d.id}</p>
                  <p className="text-xs text-text-dim">
                    {formatDate(d.date)} · {d.lines.length} items
                    {d.party ? ` · ${d.party}` : ""}
                  </p>
                </div>
                {cfg.showCost && (
                  <p className="text-text-body">{formatMoney(d.total)}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LabeledField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = `stock-field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <label className="text-sm" htmlFor={id}>
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
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
        placeholder="Search a product to add…"
        className="w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
      />
      <AnimatePresence>
        {results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-surface-2 shadow-xl"
          >
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
                    {p.quantity} in stock
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
