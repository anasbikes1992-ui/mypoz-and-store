"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HqTenant } from "@/lib/hq";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

const STATUS_CLASS: Record<string, string> = {
  active: "bg-accent/12 text-accent",
  expiring: "bg-warn/15 text-warn",
  expired: "bg-danger/15 text-danger",
  suspended: "bg-surface-3 text-text-dim",
  unknown: "bg-surface-3 text-text-dim",
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function HqTenantsPage() {
  const [tenants, setTenants] = useState<HqTenant[]>([]);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/hq/tenants")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed to load");
        setTenants(j.data.tenants);
        setSource(j.data.source);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
  }, []);

  const filtered = tenants.filter((t) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      t.name.toLowerCase().includes(needle) ||
      t.id.toLowerCase().includes(needle) ||
      String(t.plan).toLowerCase().includes(needle)
    );
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">Tenants</h1>
          <p className="mt-1 text-sm text-text-dim">
            Fleet roster
            {source
              ? ` · ${source === "reseller_licences" ? "live orgs" : "demo fallback"}`
              : ""}
          </p>
        </div>
        <Link
          href="/hq/onboard"
          className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          Onboard tenant
        </Link>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, id, plan…"
        className="mt-5 w-full max-w-md rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent"
      />

      <p className="mt-3 max-w-2xl text-xs text-text-dim">
        Open a tenant for god&apos;s-view monitoring. Password reset and temporary
        passwords are available on the tenant detail page for live org members.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-dim">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Onboarded</th>
              <th className="px-4 py-3 font-medium">Sales total</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-t border-line bg-surface-1 hover:bg-surface-2/60"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/hq/tenants/${encodeURIComponent(t.id)}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="mt-0.5 font-mono text-[11px] text-text-dim">
                    {t.id}
                  </p>
                  {t.extras.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-text-dim">
                      {t.extras.length} extra{t.extras.length === 1 ? "" : "s"}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-text-body">
                  {PLAN_NAMES[t.plan as PlanTier] ?? t.plan}
                </td>
                <td className="px-4 py-3 text-text-body">
                  {shortDate(t.onboardedAt)}
                </td>
                <td className="px-4 py-3 text-text-strong">
                  {t.salesTotal.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-text-dim">
                  {t.branches} br · {t.users} users · {t.salesCount} sales
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                      STATUS_CLASS[t.status] ?? STATUS_CLASS.unknown
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {!error && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-text-dim"
                >
                  No tenants yet — onboard one to start the pipeline.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
