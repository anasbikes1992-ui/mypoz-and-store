"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  sentQty: number;
}

interface PendingItem {
  tableId: string;
  name: string;
  qty: number;
  status: "new" | "sent";
}

export default function KdsPage() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/restaurant/orders");
      const j = await res.json();
      if (!j.success) {
        setError(j.error ?? "Failed to load orders");
        return;
      }
      const summaries: { tableId: string }[] = j.data ?? [];
      const details = await Promise.all(
        summaries.map(async (s) => {
          const r = await fetch(`/api/restaurant/orders/${s.tableId}`);
          const dj = await r.json();
          return dj.success ? (dj.data as { tableId: string; lines: OrderLine[] }) : null;
        }),
      );

      const next: PendingItem[] = [];
      for (const order of details) {
        if (!order) continue;
        for (const line of order.lines) {
          const unsent = line.quantity - line.sentQty;
          if (unsent > 0) {
            next.push({
              tableId: order.tableId,
              name: line.name,
              qty: unsent,
              status: "new",
            });
          }
          if (line.sentQty > 0) {
            next.push({
              tableId: order.tableId,
              name: line.name,
              qty: line.sentQty,
              status: "sent",
            });
          }
        }
      }
      setItems(next);
      setError(null);
    } catch {
      setError("Could not reach kitchen orders");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      setTick((t) => t + 1);
      load();
    }, 5000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Kitchen display"
        subtitle="Open restaurant tickets · refreshes every 5s"
        actions={
          <span className="text-xs text-text-dim">poll #{tick}</span>
        }
      />

      {error && (
        <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {items.length === 0 && !error ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
          No pending kitchen items.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <li
              key={`${item.tableId}-${item.name}-${item.status}-${i}`}
              className="rounded-xl border border-line bg-surface-1 px-5 py-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-text-dim">
                  Table {item.tableId}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    item.status === "new"
                      ? "bg-warn/15 text-warn"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-text-strong">
                {item.qty} × {item.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
