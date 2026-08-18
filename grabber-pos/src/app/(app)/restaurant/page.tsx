"use client";

import { useEffect, useState } from "react";
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Restaurant"
        subtitle="Tap a table to open its order"
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
          to lay out your floor.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tables.map((t, i) => {
            const order = orders[t.id];
            const occupied = !!order;
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
                    occupied
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
                  {t.area && <p className="text-xs text-text-dim">{t.area}</p>}
                  {occupied ? (
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
      )}
    </div>
  );
}
