"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

const PLANS: PlanTier[] = ["starter", "business", "enterprise"];

const INPUT =
  "w-full rounded-lg border border-line bg-surface-1 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent disabled:opacity-50";

const STEPS = ["Business", "Plan", "Review"] as const;

interface Draft {
  name: string;
  contact: string;
  plan: PlanTier;
  expiry: string;
  accentColor: string;
  logoUrl: string;
  applyBranding: boolean;
  provisionOrg: boolean;
}

const EMPTY: Draft = {
  name: "",
  contact: "",
  plan: "starter",
  expiry: "",
  accentColor: "",
  logoUrl: "",
  applyBranding: false,
  provisionOrg: false,
};

export type OnboardWizardMode = "tenant" | "hq";

/** Guided client onboarding: capture the client, set their plan, provision. */
export function OnboardWizard({
  onDone,
  mode = "tenant",
}: {
  onDone: () => void;
  /** `hq` posts to `/api/hq/tenants` (GMS fleet). Default keeps `/admin` behaviour. */
  mode?: OnboardWizardMode;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => ({
    ...EMPTY,
    // HQ fleet: create durable org + published storefront by default.
    provisionOrg: mode === "hq",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const canAdvance =
    step === 0
      ? draft.name.trim().length >= 2 && draft.contact.trim().length >= 3
      : step === 1
        ? Boolean(draft.plan)
        : draft.name.trim().length >= 2;

  const stepHint =
    step === 0 && !canAdvance
      ? "Enter a business name (2+ chars) and contact before continuing."
      : null;

  const fleet = mode === "hq";

  async function provision() {
    setBusy(true);
    setError(null);
    try {
      if (fleet) {
        const res = await fetch("/api/hq/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim(),
            contact: draft.contact.trim(),
            plan: draft.plan,
            expiry: draft.expiry,
            accentColor: draft.accentColor.trim(),
            logoUrl: draft.logoUrl.trim(),
            applyBranding: draft.applyBranding,
            provisionOrg: draft.provisionOrg,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "Could not add the client");
        }
        setOrgId(json.data?.orgId ?? null);
        setOrgSlug(json.data?.slug ?? null);
      } else {
        const res = await fetch("/api/collections/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim(),
            contact: draft.contact.trim(),
            plan: draft.plan,
            expiry: draft.expiry,
            status: "active",
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "Could not add the client");
        }

        // White-label deployments run one client per instance, so the operator can
        // apply the new client's branding and licence to this workspace directly.
        if (draft.applyBranding) {
          const applied = await fetch("/api/tenant", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brand: {
                businessName: draft.name.trim(),
                logoUrl: draft.logoUrl.trim(),
                accentColor: draft.accentColor.trim(),
              },
              license: { plan: draft.plan, expiry: draft.expiry, extras: [] },
            }),
          });
          const appliedJson = await applied.json();
          if (!appliedJson.success) {
            throw new Error(
              appliedJson.error || "Client added, but branding failed",
            );
          }
        }
      }

      setDone(true);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the client");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setDraft({ ...EMPTY, provisionOrg: mode === "hq" });
    setStep(0);
    setDone(false);
    setError(null);
    setOrgId(null);
    setOrgSlug(null);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-accent/40 bg-accent/5 p-6">
        <p className="text-lg font-semibold text-text-strong">
          {draft.name} is onboarded
        </p>
        <p className="mt-1 text-sm text-text-dim">
          {PLAN_NAMES[draft.plan]} plan
          {draft.expiry ? ` · expires ${draft.expiry}` : " · no expiry"}
          {draft.applyBranding ? " · branding applied to this workspace" : ""}
          {orgSlug ? ` · store /store/${orgSlug}` : ""}
        </p>
        <ol className="mt-4 space-y-1.5 text-sm text-text-dim">
          <li>1. Create the owner login with scripts/provision-tenant-owner.mjs (same org slug).</li>
          <li>2. Import their catalog from Products → Import (Excel/CSV).</li>
          <li>3. Set receipt header, tax and printers in Settings.</li>
          <li>4. Create staff logins under Users &amp; admins.</li>
          {fleet && (
            <li>5. Track them under HQ → Tenants / Licences.</li>
          )}
        </ol>
        <button
          onClick={reset}
          className="mt-5 rounded-xl border border-line px-4 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
        >
          Onboard another client
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-1 p-6">
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-3 text-text-dim"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs ${i === step ? "text-text-strong" : "text-text-dim"}`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px w-6 bg-line" aria-hidden />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
          className="mt-6 space-y-4"
        >
          {step === 0 && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-dim">
                  Business name
                </span>
                <input
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Anas Traders"
                  className={INPUT}
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-dim">
                  Contact (phone or email)
                </span>
                <input
                  value={draft.contact}
                  onChange={(e) => set("contact", e.target.value)}
                  placeholder="077 000 0000"
                  className={INPUT}
                />
              </label>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLANS.map((p) => (
                  <button
                    key={p}
                    onClick={() => set("plan", p)}
                    className={`rounded-xl border p-3 text-left transition ${
                      draft.plan === p
                        ? "border-accent bg-accent/10"
                        : "border-line hover:border-accent/50"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-text-strong">
                      {PLAN_NAMES[p]}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-dim">
                      {p === "starter"
                        ? "Core POS"
                        : p === "business"
                          ? "All management modules"
                          : "Everything + verticals"}
                    </span>
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-text-dim">
                  Licence expiry (blank = perpetual)
                </span>
                <input
                  type="date"
                  value={draft.expiry}
                  onChange={(e) => set("expiry", e.target.value)}
                  className={INPUT}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Summary label="Business" value={draft.name || "—"} />
                <Summary label="Contact" value={draft.contact || "—"} />
                <Summary label="Plan" value={PLAN_NAMES[draft.plan]} />
                <Summary label="Expiry" value={draft.expiry || "Perpetual"} />
              </dl>

              <fieldset className="rounded-xl border border-line p-3 space-y-3">
                <legend className="sr-only">Provisioning options</legend>
                <label className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={draft.applyBranding}
                    onChange={(e) => set("applyBranding", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-text-strong">
                      White-label this workspace for them
                    </span>
                    <span className="mt-0.5 block text-xs text-text-dim">
                      Applies the name, logo, accent and licence to this instance.
                      Use for a dedicated per-client deployment.
                    </span>
                  </span>
                </label>
                {fleet && (
                  <label className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.provisionOrg}
                      onChange={(e) => set("provisionOrg", e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-text-strong">
                        Create organization (service-role)
                      </span>
                      <span className="mt-0.5 block text-xs text-text-dim">
                        Creates organization, main branch, register, tenant
                        licence, and a published storefront at{" "}
                        <code className="text-[11px]">/store/&#123;slug&#125;</code>.
                        Owner login:{" "}
                        <code className="text-[11px]">
                          scripts/provision-tenant-owner.mjs
                        </code>
                        .
                      </span>
                    </span>
                  </label>
                )}
              </fieldset>

              {(draft.applyBranding || (fleet && draft.provisionOrg)) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-dim">
                      Logo URL
                    </span>
                    <input
                      value={draft.logoUrl}
                      onChange={(e) => set("logoUrl", e.target.value)}
                      placeholder="https://…/logo.png"
                      className={INPUT}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-text-dim">
                      Accent colour
                    </span>
                    <input
                      type="color"
                      value={draft.accentColor || "#059669"}
                      onChange={(e) => set("accentColor", e.target.value)}
                      className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface-2"
                      aria-label="Accent colour"
                    />
                  </label>
                </div>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {stepHint && !error && (
        <p className="mt-4 text-sm text-text-dim">{stepHint}</p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || busy}
          className="rounded-xl border border-line px-4 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => {
              if (!canAdvance) return;
              setStep((s) => s + 1);
            }}
            disabled={!canAdvance}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-40"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={provision}
            disabled={busy || !draft.name.trim() || !draft.contact.trim()}
            className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:opacity-90 disabled:opacity-40"
          >
            {busy ? "Provisioning…" : "Create client"}
          </button>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line px-3 py-2">
      <dt className="text-xs text-text-dim">{label}</dt>
      <dd className="mt-0.5 font-medium text-text-strong">{value}</dd>
    </div>
  );
}
