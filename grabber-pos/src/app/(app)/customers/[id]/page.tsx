"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { formatMoney } from "@/lib/format";

interface Profile {
  customer: {
    id: string;
    name: string;
    mobile: string;
    email: string;
    points: number;
    creditLimit: number;
    priceTier: string;
    address: string;
  };
  stats: {
    orderCount: number;
    lifetimeSpend: number;
    lastOrderAt: string | null;
    avgOrderValue: number;
  };
  channels: { source: string; orderCount: number; revenue: number }[];
  recentSales: {
    id: string;
    receiptNo?: string;
    total: number;
    source?: string;
    status?: string;
    createdAt: string;
    paymentMethod: string;
  }[];
  loyalty: {
    points: number;
    entries: {
      id: string;
      kind: string;
      points: number;
      note: string;
      saleId?: string;
      createdAt: string;
    }[];
  };
  timeline: {
    id: string;
    type: "sale" | "loyalty";
    at: string;
    title: string;
    subtitle?: string;
    amount?: number;
    points?: number;
  }[];
}

const SOURCE_LABEL: Record<string, string> = {
  POS: "POS",
  ONLINE_STORE: "Online",
  WHATSAPP: "WhatsApp",
  PHONE: "Phone",
  OTHER: "Other",
};

export default function CustomerProfilePage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/customers/${id}/profile`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setProfile(j.data);
          setError(null);
        } else {
          setProfile(null);
          setError(j.error ?? "Not found");
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !profile) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-sm text-text-dim">Loading customer…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <ModuleHeader title="Customer" subtitle={error ?? "Not found"} />
        <Link href="/customers" className="mt-6 inline-block text-sm text-accent">
          ← Back to customers
        </Link>
      </div>
    );
  }

  const { customer, stats, channels, recentSales, loyalty, timeline } = profile;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={customer.name || "Customer"}
        subtitle={[customer.mobile, customer.email].filter(Boolean).join(" · ") || "No contact"}
        actions={
          <Link
            href="/customers"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-body transition hover:border-accent hover:text-accent"
          >
            All customers
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Lifetime spend" value={formatMoney(stats.lifetimeSpend)} />
        <StatCard label="Orders" value={String(stats.orderCount)} />
        <StatCard label="Avg order" value={formatMoney(stats.avgOrderValue)} />
        <StatCard label="Loyalty points" value={String(loyalty.points)} accent />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-text-strong">Profile</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Tier" value={customer.priceTier} />
            <Row label="Credit limit" value={formatMoney(customer.creditLimit)} />
            {customer.address ? (
              <Row label="Address" value={customer.address} />
            ) : null}
            {stats.lastOrderAt ? (
              <Row
                label="Last order"
                value={new Date(stats.lastOrderAt).toLocaleString()}
              />
            ) : null}
          </dl>
        </section>

        <section className="rounded-xl border border-line bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-text-strong">Channels</h2>
          {channels.length === 0 ? (
            <p className="mt-3 text-sm text-text-dim">No orders linked yet (match by mobile).</p>
          ) : (
            <ul className="mt-3 divide-y divide-line text-sm">
              {channels.map((c) => (
                <li key={c.source} className="flex justify-between py-2">
                  <span>{SOURCE_LABEL[c.source] ?? c.source}</span>
                  <span className="text-text-dim">
                    {c.orderCount} · {formatMoney(c.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-surface-1 p-4">
        <h2 className="text-sm font-semibold text-text-strong">Activity</h2>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-text-dim">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {timeline.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">{item.title}</p>
                  {item.subtitle ? (
                    <p className="text-text-dim">{item.subtitle}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-text-dim">
                    {new Date(item.at).toLocaleString()}
                  </p>
                </div>
                <div className="shrink-0 text-right font-semibold">
                  {item.amount != null ? (
                    <span className="text-text-strong">{formatMoney(item.amount)}</span>
                  ) : null}
                  {item.points != null ? (
                    <span
                      className={
                        item.points < 0 ? "text-danger" : "text-accent"
                      }
                    >
                      {item.points > 0 ? `+${item.points}` : item.points} pts
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentSales.length > 0 ? (
        <section className="mt-6 rounded-xl border border-line bg-surface-1 p-4">
          <h2 className="text-sm font-semibold text-text-strong">Recent orders</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-text-dim">
                  <th className="py-2 pr-3">Receipt</th>
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentSales.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {s.receiptNo || s.id.slice(0, 8)}
                    </td>
                    <td className="py-2 pr-3">
                      {SOURCE_LABEL[s.source ?? "POS"] ?? s.source}
                    </td>
                    <td className="py-2 pr-3 text-text-dim">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">{formatMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-center">
        <Link href="/loyalty" className="text-sm text-accent hover:underline">
          View loyalty ledger
        </Link>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-1 px-4 py-3">
      <p className="text-xs text-text-dim">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          accent ? "text-accent" : "text-text-strong"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-dim">{label}</dt>
      <dd className="text-right text-text-body">{value}</dd>
    </div>
  );
}
