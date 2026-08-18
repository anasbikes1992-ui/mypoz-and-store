"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { formatMoney, formatDate } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface POLine {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}
interface PurchaseOrder {
  id: string;
  supplier: string | null;
  reference: string | null;
  status: string;
  lines: POLine[];
  total: number;
  createdAt: string;
}

export default function PurchaseOrdersPage() {
  const [supplier, setSupplier] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<POLine[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/purchase-orders")
      .then((r) => r.json())
      .then((j) => j.success && setPos(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  function addProduct(p: Product) {
    setLines((prev) =>
      prev.some((l) => l.productId === p.id)
        ? prev
        : [
            ...prev,
            { productId: p.id, name: p.name, quantity: 1, unitPrice: p.costPrice },
          ],
    );
  }
  function patch(id: string, p: Partial<POLine>) {
    setLines((prev) => prev.map((l) => (l.productId === id ? { ...l, ...p } : l)));
  }

  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  async function save() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplier || undefined,
          reference: reference || undefined,
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
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
      setSupplier("");
      setReference("");
      load();
    } finally {
      setPending(false);
    }
  }

  async function receive(id: string) {
    const res = await fetch(`/api/purchase-orders/${id}/receive`, {
      method: "POST",
    });
    const j = await res.json();
    setMsg(
      j.success
        ? { ok: true, text: `${id} received — stock updated.` }
        : { ok: false, text: j.error ?? "Failed" },
    );
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Purchase orders"
        subtitle="Raise an order, then receive it into stock (GRN)"
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <LabeledField label="Supplier" value={supplier} onChange={setSupplier} />
        <LabeledField label="Reference" value={reference} onChange={setReference} />
      </div>

      <ProductPicker onPick={addProduct} />

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-surface-1">
        {lines.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-dim">
            Search and add products to order.
          </p>
        ) : (
          <table className="w-full text-sm" aria-label="Purchase order line items">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-text-dim">
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Qty</th>
                <th className="px-4 py-2.5 font-medium">Unit cost</th>
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
                        patch(l.productId, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="w-20 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      min={0}
                      value={l.unitPrice}
                      onChange={(e) =>
                        patch(l.productId, { unitPrice: Number(e.target.value) || 0 })
                      }
                      className="w-24 rounded border border-line bg-surface-2 px-2 py-1 text-text-strong outline-none focus:border-accent"
                    />
                  </td>
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
          {lines.length > 0 && <>Total: <span className="text-text-strong">{formatMoney(total)}</span></>}
        </p>
        <button
          onClick={save}
          disabled={pending || lines.length === 0}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save purchase order"}
        </button>
      </div>

      {pos.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-text-strong">
            Purchase orders
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {pos.map((po) => (
              <li
                key={po.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {po.id}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] ${
                        po.status === "received"
                          ? "bg-accent/15 text-accent"
                          : "bg-warn/15 text-warn"
                      }`}
                    >
                      {po.status}
                    </span>
                  </p>
                  <p className="text-xs text-text-dim">
                    {formatDate(po.createdAt.slice(0, 10))} · {po.lines.length} items
                    {po.supplier ? ` · ${po.supplier}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-text-body">{formatMoney(po.total)}</span>
                  {po.status === "draft" && (
                    <button
                      onClick={() => receive(po.id)}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-dim transition hover:border-accent hover:text-accent"
                    >
                      Receive
                    </button>
                  )}
                </div>
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
  const id = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
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
        placeholder="Search a product to order…"
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
                  cost {formatMoney(p.costPrice)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
