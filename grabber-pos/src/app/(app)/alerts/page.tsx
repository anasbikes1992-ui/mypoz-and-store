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

interface OpsAlertItem {
  id: string;
  kind: string;
  title: string;
  detail: string;
  severity: "warn" | "danger";
}

interface AlertsData {
  lowStock: AlertItem[];
  expiring: AlertItem[];
  expired: AlertItem[];
  operational: OpsAlertItem[];
  counts: {
    lowStock: number;
    expiring: number;
    expired: number;
    operational: number;
  };
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
        subtitle="Stock, expiry, hire-purchase, and job SLA"
      />

      {loading || !data ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : (
        <div className="mt-8 space-y-8">
          {data.operational.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-text-strong">
                Operational ({data.counts.operational})
              </h2>
              <ul className="space-y-2">
                {data.operational.map((a) => (
                  <li
                    key={`${a.kind}-${a.id}`}
                    className={`rounded-xl border px-4 py-3 text-sm ${
                      a.severity === "danger"
                        ? "border-danger/40 bg-danger/10"
                        : "border-warn/40 bg-warn/10"
                    }`}
                  >
                    <p className="font-medium text-text-strong">{a.title}</p>
                    <p className="text-xs text-text-dim">{a.detail}</p>
                    {a.kind === "hp-overdue" && (
                      <Link
                        href="/hire-purchase"
                        className="mt-1 inline-block text-xs text-accent hover:underline"
                      >
                        Open hire purchase
                      </Link>
                    )}
                    {a.kind === "job-overdue" && (
                      <Link
                        href="/repair"
                        className="mt-1 inline-block text-xs text-accent hover:underline"
                      >
                        Open jobs
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

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
  if (count === 0) return null;
  return (
    <section>
      <h2
        className={`mb-3 text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-warn"}`}
      >
        {title} ({count})
      </h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
        {items.slice(0, 20).map((i, idx) => (
          <motion.li
            key={i.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(idx * 0.02, 0.2) }}
            className="flex items-center justify-between px-5 py-3 text-sm"
          >
            <Link href={`/products`} className="font-medium text-text-strong hover:text-accent">
              {i.name}
            </Link>
            <span className="text-text-dim">{render(i)}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
