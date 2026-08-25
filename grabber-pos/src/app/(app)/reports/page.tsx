"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

type ReportSummary = {
  revenue: number;
  count: number;
  avg: number;
  itemsSold: number;
  byMethod: { method: string; count: number; total: number }[];
  byDay: { label: string; total: number }[];
  byChannel: { source: string; count: number; revenue: number }[];
  topProducts: { name: string; qty: number }[];
};

type LeaderboardRow = {
  name: string;
  total: number;
  count: number;
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [deadStock, setDeadStock] = useState<Product[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [salesCount, setSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setReport(j.data.report ?? null);
        setDeadStock(j.data.deadStock ?? []);
        setLeaderboard(j.data.leaderboard ?? []);
        setSalesCount(Number(j.data.salesCount ?? 0));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Reports"
        subtitle={`${salesCount} transactions analysed`}
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : !report ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No sales yet — make a sale to see reports.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {salesCount > 0 && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Kpi label="Revenue" value={formatMoney(report.revenue)} />
                <Kpi label="Sales" value={String(report.count)} />
                <Kpi label="Avg. sale" value={formatMoney(report.avg)} />
                <Kpi label="Items sold" value={String(report.itemsSold)} />
              </div>

              <Panel title="Revenue — last 7 days">
                <BarList
                  rows={report.byDay.map((d) => ({
                    label: d.label,
                    value: d.total,
                    display: formatMoney(d.total),
                  }))}
                />
              </Panel>

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="By payment method">
                  <BarList
                    rows={report.byMethod.map((m) => ({
                      label: m.method,
                      value: m.total,
                      display: `${formatMoney(m.total)} · ${m.count}`,
                    }))}
                  />
                </Panel>
                <Panel title="By channel (same sales ledger)">
                  <BarList
                    rows={report.byChannel.map((m) => ({
                      label: m.source,
                      value: m.revenue,
                      display: `${formatMoney(m.revenue)} · ${m.count}`,
                    }))}
                  />
                </Panel>
              </div>
              <Panel title="Top products">
                <BarList
                  rows={report.topProducts.map((p) => ({
                    label: p.name,
                    value: p.qty,
                    display: `${p.qty} sold`,
                  }))}
                />
              </Panel>
            </>
          )}

          <Panel title="Employee leaderboard">
            <BarList
              rows={leaderboard.map((e) => ({
                label: e.name,
                value: e.total,
                display: `${formatMoney(e.total)} · ${e.count} sales`,
              }))}
            />
          </Panel>

          <Panel title="Dead stock / aging">
            <p className="mb-3 text-xs text-text-dim">
              On-hand qty &gt; 0 with no match in recent sales lines.
            </p>
            {deadStock.length === 0 ? (
              <p className="text-sm text-text-dim">No dead stock flagged.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {deadStock.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-text-strong">{p.name}</span>
                    <span className="text-text-dim">
                      qty {p.quantity} · {formatMoney(p.salePrice)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-line bg-surface-1 p-5"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-accent">{value}</p>
    </motion.div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface-1 p-5">
      <h2 className="mb-4 text-sm font-medium text-text-strong">{title}</h2>
      {children}
    </section>
  );
}

function BarList({
  rows,
}: {
  rows: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0)
    return <p className="text-sm text-text-dim">No data.</p>;
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={r.label + i}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="truncate pr-2 text-text-body">{r.label}</span>
            <span className="shrink-0 text-text-dim">{r.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(r.value / max) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full bg-accent"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
