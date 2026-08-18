"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HqSummary } from "@/lib/hq";

export default function HqHomePage() {
  const [summary, setSummary] = useState<HqSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hq/summary")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Failed to load");
        setSummary(j.data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      );
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Command center</h1>
      <p className="mt-1 text-sm text-text-dim">
        Fleet health for Grabber Mobility Solutions operators — separate from
        each tenant&apos;s{" "}
        <Link href="/admin" className="text-accent underline-offset-2 hover:underline">
          /admin
        </Link>{" "}
        console.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tenants"
          value={summary ? String(summary.tenantCount) : "…"}
        />
        <Stat
          label="Expired licences"
          value={summary ? String(summary.expiredCount) : "…"}
          tone={summary && summary.expiredCount > 0 ? "warn" : undefined}
        />
        <Stat
          label="Expiring ≤14d"
          value={summary ? String(summary.expiringCount) : "…"}
          tone={summary && summary.expiringCount > 0 ? "warn" : undefined}
        />
        <Stat
          label="Open tickets"
          value={summary ? String(summary.openTickets) : "…"}
        />
      </div>

      {summary && (
        <p className="mt-4 text-xs text-text-dim">
          Data source:{" "}
          <span className="font-medium text-text-body">
            {summary.source === "reseller_licences"
              ? "reseller_licences (service-role)"
              : "demo fallback (clients + local tenant)"}
          </span>
          {summary.source === "demo_fallback" && !summary.serviceRole && (
            <> · set SUPABASE_SERVICE_ROLE_KEY to unlock the cross-org view</>
          )}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/hq/tenants"
          title="Tenants"
          body="Browse orgs, usage counts, and white-label settings."
        />
        <QuickLink
          href="/hq/licences"
          title="Licence monitor"
          body="Expiry alerts and plan roll-up across the fleet."
        />
        <QuickLink
          href="/hq/onboard"
          title="Onboard"
          body="Provision a client into the pipeline (and optionally an org)."
        />
        <QuickLink
          href="/hq/tickets"
          title="Support tickets"
          body="Stub inbox for guiding buyers — not a full helpdesk yet."
        />
        <QuickLink
          href="/hq/docs"
          title="Docs hub"
          body="GMS ops, storefront, reseller, and production guides."
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === "warn" ? "text-warn" : "text-text-strong"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-line bg-surface-1 p-5 transition hover:border-accent/50"
    >
      <p className="text-sm font-semibold text-text-strong">{title}</p>
      <p className="mt-1 text-sm text-text-dim">{body}</p>
    </Link>
  );
}
