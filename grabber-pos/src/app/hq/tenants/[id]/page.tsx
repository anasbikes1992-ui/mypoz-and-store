"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { COMMERCE_THEME_IDS } from "@/lib/commerce/schema";
import type { HqTenant } from "@/lib/hq";
import { HQ_EXTRA_KEYS, type HqTenantOps } from "@/lib/hq-config";
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
  const [extras, setExtras] = useState<string[]>([]);
  const [ops, setOps] = useState<HqTenantOps | null>(null);
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
        setExtras(t.extras || []);
        return fetch(`/api/hq/tenants/${encodeURIComponent(id)}/ops`);
      })
      .then((r) => (r && "json" in r ? r.json() : null))
      .then((j) => {
        if (j?.success) setOps(j.data as HqTenantOps);
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
          license: { plan, expiry, extras },
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

      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          Module extras
        </h2>
        <p className="mt-1 text-xs text-text-dim">
          Add-ons on top of the plan. WhatsApp and verticals stay off until you
          enable them here (Enterprise already includes everything).
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {HQ_EXTRA_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={extras.includes(key)}
                onChange={(e) =>
                  setExtras((cur) =>
                    e.target.checked
                      ? [...cur, key]
                      : cur.filter((k) => k !== key),
                  )
                }
              />
              {key}
            </label>
          ))}
        </div>
      </section>

      {ops && (
        <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            Store &amp; channel
          </h2>
          <p className="mt-1 text-xs text-text-dim">
            Theme, announcement, and locale write through to this tenant&apos;s
            published store when service-role is available.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs text-text-dim">Theme</span>
              <select
                className={INPUT}
                value={ops.storeThemeId}
                onChange={(e) =>
                  setOps({
                    ...ops,
                    storeThemeId: e.target.value as HqTenantOps["storeThemeId"],
                  })
                }
              >
                {COMMERCE_THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-text-dim">Locale</span>
              <select
                className={INPUT}
                value={ops.locale}
                onChange={(e) =>
                  setOps({
                    ...ops,
                    locale: e.target.value as HqTenantOps["locale"],
                  })
                }
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-xs text-text-dim">
                Store announcement
              </span>
              <input
                className={INPUT}
                maxLength={200}
                value={ops.announcement}
                onChange={(e) => setOps({ ...ops, announcement: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ops.storeEnabled}
                onChange={(e) =>
                  setOps({ ...ops, storeEnabled: e.target.checked })
                }
              />
              Store published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ops.whatsappEnabled}
                onChange={(e) =>
                  setOps({ ...ops, whatsappEnabled: e.target.checked })
                }
              />
              WhatsApp bot
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ops.wholesaleEnabled}
                onChange={(e) =>
                  setOps({ ...ops, wholesaleEnabled: e.target.checked })
                }
              />
              Wholesale
            </label>
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-xs text-text-dim">
                Internal note
              </span>
              <textarea
                className={INPUT}
                rows={3}
                value={ops.supportNote}
                onChange={(e) => setOps({ ...ops, supportNote: e.target.value })}
              />
            </label>
          </div>
          <button
            type="button"
            className="mt-4 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-text-strong hover:border-accent"
            onClick={() => {
              if (!ops) return;
              setSaving(true);
              fetch(`/api/hq/tenants/${encodeURIComponent(id)}/ops`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(ops),
              })
                .then((r) => r.json())
                .then((j) => {
                  if (!j.success) throw new Error(j.error || "Ops save failed");
                  setOps(j.data);
                  setMsg("Store & channel saved");
                })
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Ops save failed"),
                )
                .finally(() => setSaving(false));
            }}
            disabled={saving}
          >
            Save store &amp; channel
          </button>
        </section>
      )}
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
