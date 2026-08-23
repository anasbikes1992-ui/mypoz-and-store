"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface TableRow {
  id: string;
  name?: string;
  area?: string;
  seats?: number;
}
interface OpenOrder {
  tableId: string;
  total: number;
  items: number;
}

export default function RestaurantFloorPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [orders, setOrders] = useState<Record<string, OpenOrder>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/collections/tables").then((r) => r.json()),
      fetch("/api/restaurant/orders").then((r) => r.json()),
    ])
      .then(([t, o]) => {
        if (t.success) setTables(t.data);
        if (o.success) {
          const map: Record<string, OpenOrder> = {};
          for (const ord of o.data as OpenOrder[]) map[ord.tableId] = ord;
          setOrders(map);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const byArea = useMemo(() => {
    const map = new Map<string, TableRow[]>();
    for (const t of tables) {
      const area = t.area?.trim() || "Main floor";
      const list = map.get(area) ?? [];
      list.push(t);
      map.set(area, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [tables]);

  const occupied = tables.filter((t) => orders[t.id]).length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Restaurant"
        subtitle={`${occupied} occupied · ${tables.length - occupied} free`}
        actions={
          <Link
            href="/tables"
            className="rounded-lg border border-line px-4 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Manage tables
          </Link>
        }
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : tables.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No tables yet.{" "}
          <Link href="/tables" className="text-accent">
            Add tables
          </Link>{" "}
          with area labels to lay out your floor.
        </p>
      ) : (
        <div className="mt-6 space-y-8">
          {byArea.map(([area, areaTables]) => (
            <section key={area}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-dim">
                {area}
                <span className="ml-2 font-normal normal-case text-text-dim">
                  ({areaTables.filter((t) => orders[t.id]).length}/
                  {areaTables.length} busy)
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {areaTables.map((t, i) => {
                  const order = orders[t.id];
                  const busy = !!order;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    >
                      <Link
                        href={`/restaurant/${t.id}`}
                        className={`flex aspect-square flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${
                          busy
                            ? "border-accent bg-accent/10 hover:bg-accent/15"
                            : "border-line bg-surface-1 hover:border-accent/50"
                        }`}
                      >
                        <span className="text-2xl" aria-hidden>
                          🍽️
                        </span>
                        <p className="mt-2 font-semibold text-text-strong">
                          {t.name ?? t.id}
                        </p>
                        {t.seats != null && t.seats > 0 && (
                          <p className="text-xs text-text-dim">{t.seats} seats</p>
                        )}
                        {busy ? (
                          <p className="mt-1 text-sm font-semibold text-accent">
                            {formatMoney(order.total)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-text-dim">Free</p>
                        )}
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
