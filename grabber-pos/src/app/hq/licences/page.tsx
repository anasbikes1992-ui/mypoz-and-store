"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HqTenant } from "@/lib/hq";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

export default function HqLicencesPage() {
  const [tenants, setTenants] = useState<HqTenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hq/tenants")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed to load");
        setTenants(j.data.tenants);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
  }, []);

  const alerts = useMemo(() => {
    return tenants
      .filter((t) => t.status === "expired" || t.status === "expiring")
      .sort((a, b) => {
        if (a.status === "expired" && b.status !== "expired") return -1;
        if (b.status === "expired" && a.status !== "expired") return 1;
        return String(a.expiry ?? "").localeCompare(String(b.expiry ?? ""));
      });
  }, [tenants]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">
        Licence monitor
      </h1>
      <p className="mt-1 text-sm text-text-dim">
        Expiry alerts across the fleet. Renewals still apply via white-label
        editor or the tenant{" "}
        <Link href="/admin" className="text-accent hover:underline">
          /admin
        </Link>{" "}
        console for dedicated deploys.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Alerts
        </h2>
        {alerts.length === 0 ? (
          <p className="mt-3 text-sm text-text-dim">
            No expired or soon-to-expire licences.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {alerts.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    href={`/hq/tenants/${encodeURIComponent(t.id)}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-text-dim">
                    {PLAN_NAMES[t.plan as PlanTier] ?? t.plan} · expires{" "}
                    {t.expiry || "—"}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
                    t.status === "expired"
                      ? "bg-danger/15 text-danger"
                      : "bg-warn/15 text-warn"
                  }`}
                >
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-dim">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-t border-line bg-surface-1">
                <td className="px-4 py-3">
                  <Link
                    href={`/hq/tenants/${encodeURIComponent(t.id)}`}
                    className="text-accent hover:underline"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {PLAN_NAMES[t.plan as PlanTier] ?? t.plan}
                </td>
                <td className="px-4 py-3">{t.expiry || "Perpetual"}</td>
                <td className="px-4 py-3 capitalize">{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
