"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDate } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface AlertItem {
  id: string;
  name: string;
  quantity: number;
  expireDate: string | null;
}
interface AlertsData {
  lowStock: AlertItem[];
  expiring: AlertItem[];
  expired: AlertItem[];
  counts: { lowStock: number; expiring: number; expired: number };
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((j) => j.success && setData(j.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Alerts"
        subtitle="Low stock, expiring and expired items"
      />

      {loading || !data ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : (
        <div className="mt-8 space-y-8">
          <AlertGroup
            title="Expired"
            tone="danger"
            count={data.counts.expired}
            items={data.expired}
            render={(i) => `expired ${formatDate(i.expireDate)}`}
          />
          <AlertGroup
            title="Expiring soon"
            tone="warn"
            count={data.counts.expiring}
            items={data.expiring}
            render={(i) => `expires ${formatDate(i.expireDate)}`}
          />
          <AlertGroup
            title="Low stock"
            tone="warn"
            count={data.counts.lowStock}
            items={data.lowStock}
            render={(i) => `${i.quantity} left`}
          />
        </div>
      )}
    </div>
  );
}

function AlertGroup({
  title,
  tone,
  count,
  items,
  render,
}: {
  title: string;
  tone: "danger" | "warn";
  count: number;
  items: AlertItem[];
  render: (i: AlertItem) => string;
}) {
  const color = tone === "danger" ? "text-danger" : "text-warn";
  const bg = tone === "danger" ? "bg-danger/15" : "bg-warn/15";
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-medium text-text-strong">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs ${bg} ${color}`}>
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-dim">
          Nothing here — all good.
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
          {items.map((i, idx) => (
            <motion.li
              key={i.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(idx * 0.01, 0.2) }}
              className="flex items-center justify-between px-5 py-2.5 text-sm"
            >
              <Link
                href="/products"
                className="text-text-strong transition hover:text-accent"
              >
                {i.name}
              </Link>
              <span className={color}>{render(i)}</span>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
