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
  grossSales?: number;
  discounts?: number;
  refunds?: number;
  netSales?: number;
  tax?: number;
  cogs?: number;
  grossProfit?: number;
  marginPct?: number;
  byCashier?: { name: string; count: number; total: number }[];
  from?: string;
  to?: string;
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
  const [authoritative, setAuthoritative] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (dateFrom) qs.set("date_from", dateFrom);
    if (dateTo) qs.set("date_to", dateTo);
    const q = qs.toString();
    fetch(`/api/reports/summary${q ? `?${q}` : ""}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setReport(j.data.report ?? null);
        setDeadStock(j.data.deadStock ?? []);
        setLeaderboard(j.data.leaderboard ?? []);
        setSalesCount(Number(j.data.salesCount ?? 0));
        setAuthoritative(Boolean(j.data.authoritative));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Reports"
        subtitle={
          authoritative
            ? `Server totals · ${salesCount} transactions`
            : `${salesCount} transactions analysed`
        }
      />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-text-dim">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-text-body"
          />
        </label>
        <label className="text-xs text-text-dim">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block rounded-lg border border-line bg-surface-1 px-2 py-1.5 text-sm text-text-body"
          />
        </label>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink"
        >
          Apply
        </button>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : !report ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No sales yet — make a sale to see reports.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Net sales" value={formatMoney(report.netSales ?? report.revenue)} />
            <Kpi label="Gross sales" value={formatMoney(report.grossSales ?? report.revenue)} />
            <Kpi label="Discounts" value={formatMoney(report.discounts ?? 0)} />
            <Kpi label="Refunds" value={formatMoney(report.refunds ?? 0)} />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="COGS" value={formatMoney(report.cogs ?? 0)} />
            <Kpi label="Gross profit" value={formatMoney(report.grossProfit ?? 0)} />
            <Kpi
              label="Margin %"
              value={`${Number(report.marginPct ?? 0).toFixed(1)}%`}
            />
            <Kpi label="Tax" value={formatMoney(report.tax ?? 0)} />
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi label="Sales count" value={String(report.count)} />
            <Kpi label="Avg basket" value={formatMoney(report.avg)} />
            <Kpi label="Items sold" value={String(report.itemsSold)} />
            <Kpi label="Revenue (net)" value={formatMoney(report.revenue)} />
          </div>

          {salesCount > 0 && (
            <>
              {report.byDay?.length > 0 && (
                <Panel title="Revenue — last 7 days">
                  <BarList
                    rows={report.byDay.map((d) => ({
                      label: d.label,
                      value: d.total,
                      display: formatMoney(d.total),
                    }))}
                  />
                </Panel>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="By payment method">
                  <BarList
                    rows={(report.byMethod ?? []).map((m) => ({
                      label: m.method,
                      value: m.total,
                      display: `${formatMoney(m.total)} · ${m.count}`,
                    }))}
                  />
                </Panel>
                <Panel title="By cashier">
                  <BarList
                    rows={(report.byCashier ?? leaderboard).map((e) => ({
                      label: e.name,
                      value: e.total,
                      display: `${formatMoney(e.total)} · ${e.count}`,
                    }))}
                  />
                </Panel>
              </div>

              {(report.byChannel?.length ?? 0) > 0 && (
                <Panel title="By channel">
                  <BarList
                    rows={report.byChannel.map((m) => ({
                      label: m.source,
                      value: m.revenue,
                      display: `${formatMoney(m.revenue)} · ${m.count}`,
                    }))}
                  />
                </Panel>
              )}

              {(report.topProducts?.length ?? 0) > 0 && (
                <Panel title="Top products">
                  <BarList
                    rows={report.topProducts.map((p) => ({
                      label: p.name,
                      value: p.qty,
                      display: `${p.qty} sold`,
                    }))}
                  />
                </Panel>
              )}
            </>
          )}

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
