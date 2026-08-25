"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";

type SaleLine = {
  id?: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type SaleRow = {
  id: string;
  receiptNo?: string;
  createdAt: string;
  total: number;
  status?: string;
  customerName?: string | null;
  lines: SaleLine[];
};

type ReturnRow = {
  id: string;
  saleId: string;
  reason: string;
  createdAt: string;
  status: string;
  refund: { amount: number; method: string } | null;
  lines: { quantity: number; refundAmount: number }[];
};

export default function ReturnsPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [saleId, setSaleId] = useState("");
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<
    Record<string, { qty: number; disposition: "restock" | "damage" | "discard" }>
  >({});
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/returns").then((r) => r.json()),
    ])
      .then(([sj, rj]) => {
        if (sj.success) {
          setSales(
            (sj.data as SaleRow[]).filter((s) => s.status !== "voided").slice(0, 40),
          );
        }
        if (rj.success) setReturns(rj.data ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  const activeSale = sales.find((s) => s.id === saleId) ?? null;

  useEffect(() => {
    if (!activeSale) {
      setSelected({});
      return;
    }
    const next: typeof selected = {};
    for (const line of activeSale.lines) {
      const key = line.id || `${line.productId}:${line.name}`;
      next[key] = { qty: 0, disposition: "restock" };
    }
    setSelected(next);
  }, [activeSale?.id]);

  async function submit() {
    if (!activeSale) {
      setMsg({ ok: false, text: "Select a sale to return against" });
      return;
    }
    if (!reason.trim()) {
      setMsg({ ok: false, text: "Enter a return reason" });
      return;
    }
    const lines = activeSale.lines
      .map((line) => {
        const key = line.id || `${line.productId}:${line.name}`;
        const pick = selected[key];
        if (!pick || !(pick.qty > 0)) return null;
        if (!line.id) return null;
        return {
          saleLineId: line.id,
          quantity: pick.qty,
          disposition: pick.disposition,
        };
      })
      .filter(Boolean) as {
      saleLineId: string;
      quantity: number;
      disposition: "restock" | "damage" | "discard";
    }[];

    if (!lines.length) {
      setMsg({
        ok: false,
        text: "Choose at least one sale line with a return quantity (durable sale line ids required)",
      });
      return;
    }

    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: activeSale.id,
          reason: reason.trim(),
          refundMethod: "cash",
          lines,
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Return failed" });
        return;
      }
      setMsg({ ok: true, text: `Return ${j.data.id} recorded` });
      setReason("");
      load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Returns & refunds"
        subtitle="Link returns to original sales, restock inventory, and record refunds"
      />

      {msg && (
        <p
          className={`mt-6 rounded-lg border px-4 py-2 text-sm ${
            msg.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      <section className="mt-6 space-y-4 rounded-xl border border-line bg-surface-1 p-5">
        <label className="block text-sm">
          <span className="mb-1 block text-text-dim">Original sale</span>
          <select
            value={saleId}
            onChange={(e) => setSaleId(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
          >
            <option value="">Select a sale…</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.receiptNo || s.id} · {formatMoney(s.total)} · {formatDateTime(s.createdAt)}
                {s.customerName ? ` · ${s.customerName}` : ""}
              </option>
            ))}
          </select>
        </label>

        {activeSale && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {activeSale.lines.map((line) => {
              const key = line.id || `${line.productId}:${line.name}`;
              const pick = selected[key] ?? { qty: 0, disposition: "restock" as const };
              return (
                <li key={key} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-strong">{line.name}</p>
                    <p className="text-xs text-text-dim">
                      Sold {line.quantity} · {formatMoney(line.unitPrice)}
                      {!line.id ? " · line id missing (demo sales cannot return via RPC)" : ""}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={line.quantity}
                    step={1}
                    disabled={!line.id}
                    value={pick.qty}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: {
                          ...pick,
                          qty: Math.max(0, Math.min(line.quantity, Number(e.target.value) || 0)),
                        },
                      }))
                    }
                    className="w-20 rounded-lg border border-line bg-surface-2 px-2 py-1"
                  />
                  <select
                    disabled={!line.id}
                    value={pick.disposition}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: {
                          ...pick,
                          disposition: e.target.value as "restock" | "damage" | "discard",
                        },
                      }))
                    }
                    className="rounded-lg border border-line bg-surface-2 px-2 py-1"
                  >
                    <option value="restock">Restock</option>
                    <option value="damage">Damage</option>
                    <option value="discard">Discard</option>
                  </select>
                </li>
              );
            })}
          </ul>
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-text-dim">Reason</span>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 outline-none focus:border-accent"
            placeholder="Customer changed mind / defective / wrong item"
          />
        </label>

        <Button disabled={pending} onClick={submit}>
          Record return + cash refund
        </Button>
      </section>

      <section className="mt-8 rounded-xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-medium text-text-strong">Recent returns</h2>
        {returns.length === 0 ? (
          <p className="mt-3 text-sm text-text-dim">No returns recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {returns.slice(0, 20).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium text-text-strong">{r.id}</p>
                  <p className="text-xs text-text-dim">
                    Sale {r.saleId} · {r.reason} · {formatDateTime(r.createdAt)}
                  </p>
                </div>
                <p className="text-text-dim">
                  {r.refund
                    ? formatMoney(r.refund.amount)
                    : `${r.lines.reduce((s, l) => s + l.refundAmount, 0)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
