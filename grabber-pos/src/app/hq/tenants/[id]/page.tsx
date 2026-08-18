"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { HqTenant } from "@/lib/hq";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent disabled:opacity-50";

const PLANS: PlanTier[] = ["starter", "business", "enterprise"];

export default function HqTenantDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id ?? ""));

  const [tenant, setTenant] = useState<HqTenant | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/hq/tenants/${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error || "Not found");
        const t = j.data as HqTenant;
        setTenant(t);
        setBusinessName(t.brand?.businessName || t.name);
        setLogoUrl(t.brand?.logoUrl || "");
        setAccentColor(t.brand?.accentColor || "");
        setPlan((t.plan as PlanTier) || "starter");
        setExpiry(t.expiry || "");
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function save() {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/hq/tenants/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { businessName, logoUrl, accentColor },
          license: { plan, expiry },
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Save failed");
      setTenant(j.data);
      setMsg("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-text-dim">Loading tenant…</p>;
  }

  if (!tenant) {
    return (
      <div>
        <p className="text-sm text-danger">{error || "Tenant not found"}</p>
        <Link href="/hq/tenants" className="mt-3 inline-block text-sm text-accent">
          ← Back to tenants
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/hq/tenants"
        className="text-sm text-text-dim transition hover:text-accent"
      >
        ← Tenants
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-text-strong">
        {tenant.name}
      </h1>
      <p className="mt-1 text-sm text-text-dim">
        Source: {tenant.source} · status{" "}
        <span className="capitalize">{tenant.status}</span>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            Usage &amp; health
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric label="Branches" value={String(tenant.branches)} />
            <Metric label="Users" value={String(tenant.users)} />
            <Metric label="Sales count" value={String(tenant.salesCount)} />
            <Metric
              label="Sales total"
              value={tenant.salesTotal.toLocaleString()}
            />
          </div>
          {tenant.source !== "reseller_licences" && (
            <p className="mt-4 text-xs text-text-dim">
              Branch / user / sales meters fill in when{" "}
              <code className="text-text-body">reseller_licences</code> is
              reachable via the service-role key.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            White-label &amp; licence
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs text-text-dim">
                Business name
              </span>
              <input
                className={INPUT}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-text-dim">Logo URL</span>
              <input
                className={INPUT}
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-text-dim">
                Accent colour
              </span>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={accentColor || "#059669"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-line bg-surface-2"
                  aria-label="Accent"
                />
                <input
                  className={`${INPUT} flex-1`}
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
              </div>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs text-text-dim">Plan</span>
                <select
                  className={INPUT}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanTier)}
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_NAMES[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-text-dim">
                  Expiry
                </span>
                <input
                  type="date"
                  className={INPUT}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                />
              </label>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {msg && <span className="text-sm text-accent">{msg}</span>}
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-[10px] uppercase text-text-dim">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-strong">{value}</p>
    </div>
  );
}
