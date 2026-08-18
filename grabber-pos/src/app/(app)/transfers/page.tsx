"use client";

import { useCallback, useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";

interface Transfer {
  id: string;
  sourceBranch: string;
  targetBranch: string;
  productId: string;
  productName: string;
  quantity: number;
  status: string;
  dispatchedBy: string;
  dispatchedAt: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
}

export default function TransfersPage() {
  const [sourceBranch, setSourceBranch] = useState("Main");
  const [targetBranch, setTargetBranch] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [dispatchedBy, setDispatchedBy] = useState("staff");
  const [notes, setNotes] = useState("");
  const [list, setList] = useState<Transfer[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/transfers")
      .then((r) => r.json())
      .then((j) => j.success && setList(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function create() {
    if (!product) {
      setMsg({ ok: false, text: "Pick a product first" });
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceBranch,
          targetBranch,
          productId: product.id,
          productName: product.name,
          quantity: Number(quantity) || 1,
          dispatchedBy,
          notes: notes || undefined,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Failed" });
        return;
      }
      setMsg({ ok: true, text: `${j.data.id} created.` });
      setProduct(null);
      setTargetBranch("");
      setQuantity("1");
      setNotes("");
      load();
    } finally {
      setPending(false);
    }
  }

  async function approve(id: string) {
    const res = await fetch(`/api/transfers/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receivedBy: dispatchedBy }),
    });
    const j = await res.json();
    setMsg(
      j.success
        ? { ok: true, text: `${id} approved.` }
        : { ok: false, text: j.error ?? "Failed" },
    );
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ModuleHeader
        title="Transfers"
        subtitle="Move stock between branches"
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Field label="Source branch" value={sourceBranch} onChange={setSourceBranch} />
        <Field label="Target branch" value={targetBranch} onChange={setTargetBranch} />
        <Field label="Dispatched by" value={dispatchedBy} onChange={setDispatchedBy} />
        <Field label="Quantity" value={quantity} onChange={setQuantity} type="number" />
      </div>

      <ProductPicker
        selected={product}
        onPick={setProduct}
      />

      <label className="mt-4 block text-sm">
        <span className="mb-1 block text-text-dim">Notes</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
        />
      </label>

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
        <Button
          disabled={pending || !product || !targetBranch.trim()}
          onClick={create}
        >
          {pending ? "Saving…" : "Create transfer"}
        </Button>
      </div>

      {list.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-text-strong">
            Transfer requests
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {list.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {t.id}
                    <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-dim">
                      {t.status}
                    </span>
                  </p>
                  <p className="text-xs text-text-dim">
                    {t.productName} × {t.quantity} · {t.sourceBranch} →{" "}
                    {t.targetBranch}
                  </p>
                  <p className="text-xs text-text-dim">
                    {formatDateTime(t.dispatchedAt)} · {t.dispatchedBy}
                  </p>
                </div>
                {t.status !== "received_approved" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => approve(t.id)}
                  >
                    Approve
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

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}

function ProductPicker({
  selected,
  onPick,
}: {
  selected: Product | null;
  onPick: (p: Product) => void;
}) {
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
        placeholder={
          selected ? `Selected: ${selected.name}` : "Search product to transfer…"
        }
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
                <span className="text-xs text-text-dim">qty {p.quantity}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
