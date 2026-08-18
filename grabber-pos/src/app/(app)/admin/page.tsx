"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CollectionManager } from "@/components/collections/CollectionManager";
import { OnboardWizard } from "@/components/admin/OnboardWizard";
import { useBrand } from "@/components/brand/BrandProvider";
import {
  PLAN_NAMES,
  planEnabledKeys,
  type PlanTier,
} from "@/lib/plans";
import { MODULE_GROUPS } from "@/lib/modules";

const PLAN_TIERS: PlanTier[] = ["starter", "business", "enterprise"];

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent disabled:opacity-50";

const PLAN_BLURB: Record<PlanTier, string> = {
  starter: "Core POS — retail, wholesale, products, inventory, reports.",
  business: "Everything in Starter plus all management modules (no sale-mode verticals).",
  enterprise: "The full platform — every vertical and module unlocked.",
};

function allTiles() {
  return MODULE_GROUPS.flatMap((g) => g.tiles);
}

export default function AdminPage() {
  const { refresh } = useBrand();

  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [plan, setPlan] = useState<PlanTier>("enterprise");
  const [expiry, setExpiry] = useState("");

  /** Bumped after onboarding so the wizard resets and the client list reloads. */
  const [wizardRun, setWizardRun] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [licenceMsg, setLicenceMsg] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    salesCount: number;
    todayRevenue: number;
    productCount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setBusinessName(j.data.brand.businessName ?? "");
        setLogoUrl(j.data.brand.logoUrl ?? "");
        setAccentColor(j.data.brand.accentColor ?? "");
        setPlan(j.data.license.plan);
        setExpiry(j.data.license.expiry ?? "");
      })
      .catch(() => setError("Could not load the current configuration."))
      .finally(() => setLoading(false));

    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/products?pageSize=500").then((r) => r.json()),
    ])
      .then(([sj, pj]) => {
        const sales = sj.success ? (sj.data as { total?: number; createdAt?: string }[]) : [];
        const today = new Date().toISOString().slice(0, 10);
        const todayRevenue = sales
          .filter((s) => String(s.createdAt ?? "").startsWith(today))
          .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const productCount =
          pj.success && pj.data?.total != null
            ? Number(pj.data.total)
            : pj.success && Array.isArray(pj.data?.items)
              ? pj.data.items.length
              : 0;
        setUsage({
          salesCount: sales.length,
          todayRevenue,
          productCount,
        });
      })
      .catch(() => undefined);
  }, []);

  const planAmounts: Record<PlanTier, number> = {
    starter: 2500,
    business: 7500,
    enterprise: 15000,
  };

  async function recordLicencePayment() {
    setLicenceMsg(null);
    try {
      const amount = planAmounts[plan];
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "licence.payment",
          details: `Recorded stub payment ${amount} for ${plan}`,
          metadata: { plan, amount },
        }),
      });
      try {
        await fetch("/api/collections/income", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Licence payment · ${PLAN_NAMES[plan]}`,
            amount,
            date: new Date().toISOString().slice(0, 10),
            category: "licence",
          }),
        });
      } catch {
        // optional
      }
      setLicenceMsg(`Recorded stub payment of LKR ${amount.toLocaleString()}`);
    } catch {
      setLicenceMsg("Could not record payment");
    }
  }

  // Live preview of what the chosen plan unlocks.
  const enabled = planEnabledKeys(
    plan,
    allTiles().map((t) => t.key),
  );
  const tiles = allTiles();
  const enabledCount = tiles.filter((t) => enabled.has(t.key)).length;

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: { businessName, logoUrl, accentColor },
          license: { plan, expiry, extras: [] },
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Save failed");
      setSaved(true);
      refresh(); // re-applies branding + gating across the shell
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-semibold text-text-strong">
          Super-admin console
        </h1>
        <p className="mt-1 text-sm text-text-dim">
          White-label the workspace, set the licence plan, and manage client
          organizations.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Branding + licence form */}
        <section className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            This workspace
          </h2>

          <div className="mt-5 space-y-4">
            <Field label="Business name">
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="GRABBER POS"
                disabled={loading}
                className={INPUT}
              />
            </Field>

            <Field label="Logo URL">
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…/logo.png"
                disabled={loading}
                className={INPUT}
              />
            </Field>

            <Field label="Accent colour">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={accentColor || "#059669"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  disabled={loading}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface-2"
                  aria-label="Accent colour picker"
                />
                <input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#059669 (leave blank for default)"
                  disabled={loading}
                  className={`${INPUT} flex-1`}
                />
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Licence plan">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanTier)}
                  disabled={loading}
                  className={INPUT}
                >
                  {PLAN_TIERS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_NAMES[p]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Licence expiry">
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  disabled={loading}
                  className={INPUT}
                />
              </Field>
            </div>

            <p className="text-xs text-text-dim">{PLAN_BLURB[plan]}</p>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving || loading}
                className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & apply"}
              </button>
              {saved && (
                <span className="text-sm text-accent">Applied ✓</span>
              )}
              {error && <span className="text-sm text-danger">{error}</span>}
            </div>
          </div>
        </section>

        {/* Licence summary / live preview */}
        <section className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            Licence summary
          </h2>

          <div className="mt-5 space-y-4">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-text-strong">
                {PLAN_NAMES[plan]}
              </span>
              <span className="text-sm text-text-dim">
                {enabledCount} / {tiles.length} modules
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${(enabledCount / tiles.length) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {tiles.map((t) => (
                <span
                  key={t.key}
                  title={t.title}
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    enabled.has(t.key)
                      ? "bg-accent/12 text-accent"
                      : "bg-surface-3 text-text-dim line-through opacity-60"
                  }`}
                >
                  {t.title}
                </span>
              ))}
            </div>

            <p className="pt-1 text-xs text-text-dim">
              Locked modules appear with a{" "}
              <span className="text-warn">🔒 Upgrade</span> badge on the home
              launcher and can&apos;t be opened until the plan is raised.
            </p>
          </div>
        </section>
      </div>

      {/* Onboard a new client */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-dim">
          Onboard a client
        </h2>
        <OnboardWizard key={wizardRun} onDone={() => setWizardRun((n) => n + 1)} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            Licence billing (stub)
          </h2>
          <p className="mt-3 text-sm text-text-body">
            Plan amount:{" "}
            <span className="font-semibold text-accent">
              LKR {planAmounts[plan].toLocaleString()}
            </span>{" "}
            / month (demo)
          </p>
          <p className="mt-1 text-xs text-text-dim">
            Fiscal provider: stub · records audit (+ optional income)
          </p>
          <button
            type="button"
            onClick={() => void recordLicencePayment()}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink"
          >
            Record payment
          </button>
          {licenceMsg && (
            <p className="mt-2 text-sm text-accent">{licenceMsg}</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-surface-1 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-dim">
            Usage this tenant
          </h2>
          {usage ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">Sales listed</p>
                <p className="mt-1 text-xl font-semibold text-text-strong">
                  {usage.salesCount}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">Products</p>
                <p className="mt-1 text-xl font-semibold text-text-strong">
                  {usage.productCount}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 p-3">
                <p className="text-[10px] uppercase text-text-dim">Today rev.</p>
                <p className="mt-1 text-xl font-semibold text-accent">
                  {usage.todayRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-dim">Loading usage…</p>
          )}
        </div>
      </section>

      {/* Client organizations */}
      <section className="mt-10">
        <CollectionManager key={`clients-${wizardRun}`} name="clients" />
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-dim">
        {label}
      </span>
      {children}
    </label>
  );
}
