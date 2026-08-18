"use client";

import { useCallback, useEffect, useState } from "react";
import type { Sale } from "@/lib/types";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

export function SalesHistoryClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/sales")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSales(j.data);
      })
      .catch(() => setError("Failed to load sales"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function voidSale(sale: Sale) {
    if (sale.status === "voided") return;
    const reason = window.prompt("Void reason");
    if (!reason?.trim()) return;
    const managerPin = window.prompt("Manager PIN");
    if (!managerPin) return;

    setVoiding(sale.id);
    setError(null);
    try {
      const res = await fetch(`/api/sales/${sale.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), managerPin }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Void failed");
        return;
      }
      load();
    } catch {
      setError("Could not reach server");
    } finally {
      setVoiding(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Sales history"
        subtitle={
          loading
            ? "Loading…"
            : `${sales.length} most recent transactions`
        }
      />

      {error && (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!loading && sales.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No sales recorded yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {sales.map((s) => (
            <details
              key={s.id}
              className="group rounded-xl border border-line bg-surface-1 transition-colors hover:border-accent/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                <div>
                  <p className="font-medium text-text-strong">
                    {s.id}
                    {s.status === "voided" && (
                      <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-danger">
                        Voided
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-dim">
                    {formatDateTime(s.createdAt)} · {s.paymentMethod} ·{" "}
                    {s.lines.length} lines
                  </p>
                </div>
                <p
                  className={`font-semibold ${
                    s.status === "voided"
                      ? "text-text-dim line-through"
                      : "text-accent"
                  }`}
                >
                  {formatMoney(s.total)}
                </p>
              </summary>
              <div className="border-t border-line px-5 py-3">
                <ul className="space-y-1.5 text-sm">
                  {s.lines.map((l, i) => (
                    <li
                      key={`${l.productId}-${i}`}
                      className="flex justify-between text-text-dim"
                    >
                      <span>
                        {l.quantity} × {l.name}
                        {l.discount > 0 && (
                          <span className="text-warn">
                            {" "}
                            (−{formatMoney(l.discount)}/u)
                          </span>
                        )}
                      </span>
                      <span className="text-text-body">
                        {formatMoney(l.lineTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                {s.status === "voided" && s.voidReason && (
                  <p className="mt-2 text-xs text-danger">
                    Void: {s.voidReason}
                    {s.voidedAt ? ` · ${formatDateTime(s.voidedAt)}` : ""}
                  </p>
                )}
                {s.status !== "voided" && (
                  <button
                    type="button"
                    disabled={voiding === s.id}
                    onClick={() => void voidSale(s)}
                    className="mt-3 rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
                  >
                    {voiding === s.id ? "Voiding…" : "Void sale"}
                  </button>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
