"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { COMMERCE_THEME_IDS } from "@/lib/commerce/schema";
import type { HqTenant, HqTenantMonitor } from "@/lib/hq";
import { HQ_EXTRA_KEYS, type HqTenantOps } from "@/lib/hq-config";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent disabled:opacity-50";

const PLANS: PlanTier[] = ["starter", "business", "enterprise"];

export default function HqTenantDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params.id ?? ""));

  const [tenant, setTenant] = useState<HqTenant | null>(null);
  const [monitor, setMonitor] = useState<HqTenantMonitor | null>(null);
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
  const [passwordNote, setPasswordNote] = useState<string | null>(null);

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
        return Promise.all([
          fetch(`/api/hq/tenants/${encodeURIComponent(id)}/ops`).then((r) =>
            r.json(),
          ),
          fetch(`/api/hq/tenants/${encodeURIComponent(id)}/monitor`).then((r) =>
            r.json(),
          ),
        ]);
      })
      .then(([opsJ, monJ]) => {
        if (opsJ?.success) setOps(opsJ.data as HqTenantOps);
        if (monJ?.success) setMonitor(monJ.data as HqTenantMonitor);
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

  async function setSuspended(suspended: boolean) {
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/hq/tenants/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: suspended ? "suspended" : "active",
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Status update failed");
      setTenant(j.data);
      setMsg(suspended ? "Tenant suspended" : "Tenant unsuspended");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeFromPipeline() {
    if (
      !confirm(
        "Remove from pipeline (demo clients only)? Organizations are never deleted.",
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/hq/tenants/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Remove failed");
      window.location.href = "/hq/tenants";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed");
      setSaving(false);
    }
  }

  async function passwordOp(userId: string, action: "set" | "send_reset") {
    if (
      action === "set" &&
      !confirm(
        "Set a new temporary password for this user? Show it to them once — it will not be stored in HQ.",
      )
    ) {
      return;
    }
    if (
      action === "send_reset" &&
      !confirm("Send (or generate) a password reset link for this user?")
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setPasswordNote(null);
    try {
      const res = await fetch(
        `/api/hq/tenants/${encodeURIComponent(id)}/users/password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action }),
        },
      );
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Password op failed");
      const d = j.data as {
        action: string;
        email: string;
        fullName: string;
        temporaryPassword?: string;
        loginUrl?: string;
        emailed?: boolean;
        resetUrl?: string | null;
      };
      if (d.action === "set" && d.temporaryPassword) {
        setPasswordNote(
          `Temporary password for ${d.fullName} (${d.email}):\n${d.temporaryPassword}\n\nLogin: ${d.loginUrl ?? "/login"}\nShow this once to the client, then dismiss.`,
        );
        setMsg("Temporary password set");
      } else if (d.emailed) {
        setMsg(`Reset email sent to ${d.email}`);
      } else if (d.resetUrl) {
        setPasswordNote(
          `Email not configured — copy this one-time reset link for ${d.email}:\n${d.resetUrl}`,
        );
        setMsg("Reset link generated (copy below)");
      } else {
        setMsg(`Password reset processed for ${d.email}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Password op failed");
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

  const isSuspended = tenant.status === "suspended";

  return (
    <div>
      <Link
        href="/hq/tenants"
        className="text-sm text-text-dim transition hover:text-accent"
      >
        ← Tenants
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-strong">
            {tenant.name}
          </h1>
          <p className="mt-1 text-sm text-text-dim">
            Source: {tenant.source} · status{" "}
            <span className="capitalize">{tenant.status}</span>
            {monitor?.slug ? ` · /${monitor.slug}` : ""}
            {monitor?.onboardedAt
              ? ` · onboarded ${shortDate(monitor.onboardedAt)}`
              : tenant.onboardedAt
                ? ` · onboarded ${shortDate(tenant.onboardedAt)}`
                : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void setSuspended(!isSuspended)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
              isSuspended
                ? "bg-accent text-accent-ink"
                : "border border-danger/40 text-danger hover:bg-danger/10"
            }`}
          >
            {isSuspended ? "Unsuspend" : "Suspend"}
          </button>
          {tenant.source === "clients" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void removeFromPipeline()}
              className="rounded-xl border border-line px-4 py-2 text-sm text-text-dim hover:border-danger hover:text-danger disabled:opacity-50"
              title="Remove from pipeline (demo clients only)"
            >
              Remove from pipeline
            </button>
          )}
        </div>
      </div>
      {tenant.source === "clients" && (
        <p className="mt-2 text-xs text-text-dim">
          Remove from pipeline (demo clients only) — organizations are never
          hard-deleted.
        </p>
      )}

      {/* God's view */}
      <section className="mt-6 rounded-2xl border border-line bg-surface-1 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
          God&apos;s view
        </h2>
        {!monitor ? (
          <p className="mt-3 text-sm text-text-dim">Monitor unavailable.</p>
        ) : (
          <div className="mt-4 space-y-6">
            {monitor.quiet && (
              <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
                Quiet shop — products on file, no sales in the last 14 days.
              </p>
            )}
            <div>
              <h3 className="text-xs font-semibold uppercase text-text-dim">
                Period sales
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Sales 7d" value={String(monitor.period.sales7d)} />
                <Metric
                  label="Revenue 7d"
                  value={monitor.period.revenue7d.toLocaleString()}
                />
                <Metric
                  label="Sales 30d"
                  value={String(monitor.period.sales30d)}
                />
                <Metric
                  label="Revenue 30d"
                  value={monitor.period.revenue30d.toLocaleString()}
                />
              </div>
              {monitor.period.bySource.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-text-dim">
                      <tr>
                        <th className="py-1 pr-4 font-medium">Source</th>
                        <th className="py-1 pr-4 font-medium">Count</th>
                        <th className="py-1 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitor.period.bySource.map((row) => (
                        <tr key={row.source} className="border-t border-line">
                          <td className="py-1.5 pr-4 text-text-body">
                            {row.source}
                          </td>
                          <td className="py-1.5 pr-4 text-text-body">
                            {row.count}
                          </td>
                          <td className="py-1.5 text-text-strong">
                            {row.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase text-text-dim">
                Stock health
              </h3>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <Metric
                  label="Products"
                  value={String(monitor.stock.productCount)}
                />
                <Metric
                  label="Low stock"
                  value={String(monitor.stock.lowStock)}
                />
                <Metric
                  label="Out of stock"
                  value={String(monitor.stock.outOfStock)}
                />
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase text-text-dim">
                  Branches
                </h3>
                {monitor.branches.length === 0 ? (
                  <p className="mt-2 text-sm text-text-dim">No branches.</p>
                ) : (
                  <table className="mt-2 min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-text-dim">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Name</th>
                        <th className="py-1 pr-3 font-medium">Code</th>
                        <th className="py-1 font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitor.branches.map((b) => (
                        <tr key={b.id} className="border-t border-line">
                          <td className="py-1.5 pr-3">{b.name}</td>
                          <td className="py-1.5 pr-3 font-mono text-xs">
                            {b.code}
                          </td>
                          <td className="py-1.5">
                            {b.isActive ? "Yes" : "No"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase text-text-dim">
                  Users &amp; password reset
                </h3>
                {monitor.users.length === 0 ? (
                  <p className="mt-2 text-sm text-text-dim">No users.</p>
                ) : (
                  <table className="mt-2 min-w-full text-left text-sm">
                    <thead className="text-xs uppercase text-text-dim">
                      <tr>
                        <th className="py-1 pr-3 font-medium">Name</th>
                        <th className="py-1 pr-3 font-medium">Email</th>
                        <th className="py-1 pr-3 font-medium">Role</th>
                        <th className="py-1 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monitor.users.map((u) => (
                        <tr key={u.id} className="border-t border-line">
                          <td className="py-1.5 pr-3">
                            {u.fullName || "—"}
                            {!u.isActive && (
                              <span className="ml-1 text-[10px] text-text-dim">
                                (inactive)
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-xs text-text-dim">
                            {u.email || "—"}
                          </td>
                          <td className="py-1.5 pr-3 capitalize">{u.role}</td>
                          <td className="py-1.5">
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                disabled={saving}
                                className="rounded-md border border-line px-2 py-0.5 text-[11px] font-medium text-text-body hover:border-accent hover:text-accent disabled:opacity-40"
                                onClick={() =>
                                  void passwordOp(u.id, "send_reset")
                                }
                              >
                                Email reset
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                className="rounded-md border border-line px-2 py-0.5 text-[11px] font-medium text-text-body hover:border-accent hover:text-accent disabled:opacity-40"
                                onClick={() => void passwordOp(u.id, "set")}
                              >
                                Temp password
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {passwordNote && (
                  <div className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-text-body">
                    <pre className="whitespace-pre-wrap font-sans">
                      {passwordNote}
                    </pre>
                    <button
                      type="button"
                      className="mt-2 text-accent underline"
                      onClick={() => setPasswordNote(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">Storefront</p>
                {monitor.storefront ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-text-strong">
                      /{monitor.storefront.slug ?? "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-text-dim">
                      {monitor.storefront.enabled ? "Enabled" : "Disabled"}
                      {monitor.storefront.status
                        ? ` · ${monitor.storefront.status}`
                        : ""}
                      {monitor.storefront.domain
                        ? ` · ${monitor.storefront.domain}`
                        : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-text-dim">None</p>
                )}
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">WhatsApp</p>
                <p className="mt-1 text-sm font-semibold text-text-strong">
                  {monitor.whatsapp.phoneNumberIdSet
                    ? "Number attached"
                    : "No number"}
                </p>
                <p className="mt-0.5 text-xs text-text-dim">
                  {monitor.whatsapp.tokenSet ? "Token set" : "No token"} ·{" "}
                  {monitor.whatsapp.locale}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">
                  Online orders pending
                </p>
                <p className="mt-1 text-lg font-semibold text-text-strong">
                  {monitor.openOnlineOrders}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

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
                {COMMERCE_THEME_IDS.map((tid) => (
                  <option key={tid} value={tid}>
                    {tid}
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

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <p className="text-[10px] uppercase text-text-dim">{label}</p>
      <p className="mt-1 text-lg font-semibold text-text-strong">{value}</p>
    </div>
  );
}
