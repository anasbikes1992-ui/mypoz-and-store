"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import type { Sale } from "@/lib/types";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/sales")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setSales(j.data);
        else setError(j.error ?? "Failed to load");
      })
      .catch(() => setError("Could not reach server"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function voidSale(id: string) {
    const reason = window.prompt("Void reason (required)");
    if (!reason?.trim()) return;
    const managerPin = window.prompt("Manager PIN");
    if (!managerPin) return;
    const res = await fetch(`/api/sales/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim(), managerPin }),
    });
    const j = await res.json();
    if (!j.success) {
      window.alert(j.error ?? "Void failed");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Sales history"
        subtitle={
          loading ? "Loading…" : `${sales.length} most recent transactions`
        }
      />

      {error && (
        <p className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {!loading && sales.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No sales recorded yet.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {sales.map((s) => {
            const voided = s.status === "voided";
            return (
              <details
                key={s.id}
                className={`group rounded-xl border bg-surface-1 transition-colors ${
                  voided
                    ? "border-danger/30 opacity-80"
                    : "border-line hover:border-accent/40"
                }`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-medium text-text-strong">
                      {s.id}
                      {voided && (
                        <span className="ml-2 text-xs font-semibold text-danger">
                          VOIDED
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-dim">
                      {formatDateTime(s.createdAt)} · {s.paymentMethod} ·{" "}
                      {s.lines.length} lines
                      {voided && s.voidReason ? ` · ${s.voidReason}` : ""}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${voided ? "text-text-dim line-through" : "text-accent"}`}
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
                          {l.serial ? ` · SN ${l.serial}` : ""}
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
                  {!voided && (
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => void voidSale(s.id)}
                      >
                        Void sale
                      </Button>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
