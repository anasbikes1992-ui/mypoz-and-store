"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HqSummary } from "@/lib/hq";

export default function HqHomePage() {
  const [summary, setSummary] = useState<HqSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeSlug, setStoreSlug] = useState("main-store");
  const [waConfigured, setWaConfigured] = useState<boolean | null>(null);

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

    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.storeSlug) setStoreSlug(j.data.storeSlug);
      })
      .catch(() => undefined);

    fetch("/api/whatsapp/status")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setWaConfigured(Boolean(j.data?.configured));
      })
      .catch(() => setWaConfigured(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Command center</h1>
      <p className="mt-1 text-sm text-text-dim">
        MyPoz HQ fleet health for operators — separate from each tenant&apos;s{" "}
        <Link href="/admin" className="text-accent underline-offset-2 hover:underline">
          /admin
        </Link>{" "}
        console. GMS access stays gated; tenant owners do not see this portal.
      </p>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          label="Tenants"
          value={summary ? String(summary.tenantCount) : "…"}
        />
        <Stat
          label="Sales total"
          value={summary ? summary.salesTotal.toLocaleString() : "…"}
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/hq/tenants"
          className="rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent/50"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
            Quiet shops
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              summary && (summary.quietShopCount ?? 0) > 0
                ? "text-warn"
                : "text-text-strong"
            }`}
          >
            {summary ? String(summary.quietShopCount ?? 0) : "…"}
          </p>
          <p className="mt-1 text-xs text-text-dim">
            Products on file, no sales in 14d — open tenants
          </p>
        </Link>
        <Stat
          label="Low-stock orgs"
          value={summary ? String(summary.lowStockOrgs ?? 0) : "…"}
          tone={
            summary && (summary.lowStockOrgs ?? 0) > 0 ? "warn" : undefined
          }
        />
        <Stat
          label="WA attached"
          value={summary ? String(summary.waAttachedCount ?? 0) : "…"}
        />
        <Stat
          label="Live storefronts"
          value={summary ? String(summary.storefrontLiveCount ?? 0) : "…"}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatusCard
          label="Storefront"
          value={`/store/${storeSlug}`}
          href={`/store/${storeSlug}`}
          hint="Public catalog on the same inventory as POS"
        />
        <StatusCard
          label="WhatsApp Cloud API"
          value={
            waConfigured == null
              ? "…"
              : waConfigured
                ? "Credentials present"
                : "Not configured"
          }
          href="/hq/whatsapp"
          hint="Official Graph API only — see fleet inbox"
          tone={waConfigured === false ? "warn" : undefined}
        />
        <StatusCard
          label="Tenant admin"
          value="Owner role required"
          hint="If login works but the org is empty, run upsert-admin. For forgotten logins, use Email reset / Temp password on the tenant detail page."
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
          href="/hq/whatsapp"
          title="WhatsApp"
          body="Cloud API connection status and conversation overview."
        />
        <QuickLink
          href="/hq/tickets"
          title="Support tickets"
          body="Open and resolve buyer and tenant support requests."
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

function StatusCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
  tone?: "warn";
}) {
  const inner = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
        {label}
      </p>
      <p
        className={`mt-1 truncate text-sm font-semibold ${
          tone === "warn" ? "text-warn" : "text-text-strong"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-text-dim">{hint}</p>
    </>
  );
  const className =
    "block rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent/50";
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
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
