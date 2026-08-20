"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { formatDateTime } from "@/lib/format";

type Segment = "Champions" | "At risk" | "New" | "Unknown";

interface CustomerRow {
  id: string;
  name?: string;
  mobile?: string;
  points?: number;
  creditLimit?: number;
  createdAt?: string;
}

interface SaleRow {
  customerMobile?: string | null;
  createdAt?: string;
}

interface CrmRow {
  id: string;
  name: string;
  mobile: string;
  points: number;
  lastPurchaseAt: string | null;
  segment: Segment;
}

function daysAgo(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function segmentFor(c: CustomerRow, lastPurchaseAt: string | null): Segment {
  const points = Number(c.points) || 0;
  const credit = Number(c.creditLimit) || 0;
  if (points > 100 || credit >= 50_000) return "Champions";

  const createdDays = daysAgo(c.createdAt);
  if (createdDays !== null && createdDays <= 30) return "New";

  const purchaseDays = daysAgo(lastPurchaseAt);
  if (purchaseDays === null && !c.createdAt) return "Unknown";
  if (purchaseDays !== null && purchaseDays > 90) return "At risk";
  if (purchaseDays === null && createdDays !== null && createdDays > 90) {
    return "At risk";
  }
  if (purchaseDays === null) return "Unknown";
  return "Unknown";
}

const SEGMENT_FILTERS: Array<Segment | "All"> = [
  "All",
  "Champions",
  "At risk",
  "New",
  "Unknown",
];

const BROADCAST: Record<Segment, string> = {
  Champions:
    "Hi {{name}}! Thanks for being a valued MyPoz customer. Enjoy a member perk on your next visit.",
  "At risk":
    "Hi {{name}}, we miss you at the shop! Reply to this WhatsApp for a welcome-back offer.",
  New: "Hi {{name}}, welcome! Save this number for order updates and exclusive drops.",
  Unknown:
    "Hi {{name}}, thanks for shopping with us. Reply STOP to opt out of updates.",
};

export default function CrmLitePage() {
  const [rows, setRows] = useState<CrmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Segment | "All">("All");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [custRes, salesRes] = await Promise.all([
          fetch("/api/collections/customers"),
          fetch("/api/sales"),
        ]);
        const custJson = await custRes.json();
        const salesJson = await salesRes.json();
        if (!custJson.success || cancelled) return;

        const customers = (custJson.data ?? []) as CustomerRow[];
        const sales = (salesJson.success ? salesJson.data : []) as SaleRow[];

        const lastByMobile = new Map<string, string>();
        for (const s of sales) {
          const m = String(s.customerMobile ?? "").replace(/\D/g, "");
          if (!m || !s.createdAt) continue;
          const prev = lastByMobile.get(m);
          if (!prev || s.createdAt > prev) lastByMobile.set(m, s.createdAt);
        }

        const mapped: CrmRow[] = customers.map((c) => {
          const mobile = String(c.mobile ?? "");
          const key = mobile.replace(/\D/g, "");
          const lastPurchaseAt = key ? lastByMobile.get(key) ?? null : null;
          return {
            id: c.id,
            name: String(c.name ?? "—"),
            mobile,
            points: Number(c.points) || 0,
            lastPurchaseAt,
            segment: segmentFor(c, lastPurchaseAt),
          };
        });
        if (!cancelled) setRows(mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (filter === "All" ? rows : rows.filter((r) => r.segment === filter)),
    [rows, filter],
  );

  function copyBroadcast(seg: Segment) {
    const names = rows
      .filter((r) => r.segment === seg)
      .map((r) => r.name)
      .slice(0, 20);
    const tpl = BROADCAST[seg];
    const draft = [
      `WhatsApp broadcast draft — ${seg} (${rows.filter((r) => r.segment === seg).length} customers)`,
      "",
      tpl,
      "",
      "Sample recipients:",
      ...names.map((n) => `· ${n}`),
      "",
      "(Copy only — no mass send without WhatsApp Cloud API token.)",
    ].join("\n");
    void navigator.clipboard.writeText(draft).then(() => {
      setCopied(seg);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="CRM lite"
        subtitle="Customer segments · points · last purchase"
        actions={
          <Link
            href="/customers"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Open customers
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {SEGMENT_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              filter === s
                ? "border-accent bg-accent/10 text-accent"
                : "border-line text-text-dim hover:border-accent hover:text-accent"
            }`}
          >
            {s}
            {s !== "All" && (
              <span className="ml-1 text-xs opacity-70">
                {rows.filter((r) => r.segment === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {filter !== "All" && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => copyBroadcast(filter)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            {copied === filter
              ? "Copied draft"
              : `WhatsApp broadcast draft · ${filter}`}
          </button>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-line bg-surface-1">
        {loading ? (
          <p className="px-5 py-8 text-sm text-text-dim">Loading customers…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-sm text-text-dim">
            No customers in this filter.{" "}
            <Link href="/customers" className="text-accent hover:underline">
              Add customers
            </Link>
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface-2/60 text-xs uppercase tracking-wide text-text-dim">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium">Last purchase</th>
                <th className="px-4 py-3 font-medium">Segment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-surface-2/40">
                  <td className="px-4 py-3 font-medium text-text-strong">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-text-dim">{r.mobile || "—"}</td>
                  <td className="px-4 py-3 text-text-strong">{r.points}</td>
                  <td className="px-4 py-3 text-text-dim">
                    {r.lastPurchaseAt
                      ? formatDateTime(r.lastPurchaseAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-line px-2 py-0.5 text-xs text-text-dim">
                      {r.segment}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-3 text-xs text-text-dim">
        Segments are heuristic (points / credit / recency). Last purchase matches
        sale history by mobile when available.
        {filter === "All" ? " Pick a segment to copy a WhatsApp draft." : ""}
      </p>
    </div>
  );
}
