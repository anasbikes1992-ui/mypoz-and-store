"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  COMMERCE_THEME_IDS,
  type CommerceThemeId,
  type StoreConfig,
} from "@/lib/commerce/schema";
import { THEMES } from "@/lib/commerce/themes";
import { INDUSTRY_PRESETS } from "@/lib/commerce/theme-pack";
import { Button } from "@/components/ui/Button";

const INDUSTRIES = [
  { id: "fashion", label: "Fashion" },
  { id: "electronics", label: "Electronics" },
  { id: "grocery", label: "Grocery" },
  { id: "food", label: "Restaurant / Cafe" },
  { id: "services", label: "Services" },
  { id: "local", label: "Other / Local SME" },
] as const;

type Step = "industry" | "theme" | "details" | "payments" | "delivery" | "done";

export function OnboardingWizard({
  initial,
  storeUrl,
}: {
  initial: StoreConfig;
  storeUrl: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("industry");
  const [industry, setIndustry] = useState("local");
  const [themeId, setThemeId] = useState<CommerceThemeId>(initial.themeId);
  const [name, setName] = useState(initial.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = INDUSTRY_PRESETS.filter((p) => p.industry === industry);

  const publish = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const draftRes = await fetch("/api/commerce", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...initial,
          name,
          themeId,
          status: "published",
        }),
      });
      if (!draftRes.ok) throw new Error("Could not save store");

      const pubRes = await fetch("/api/commerce/publish", { method: "POST" });
      if (!pubRes.ok) throw new Error("Could not publish store");

      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }, [initial, name, themeId]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex gap-2">
        {(["industry", "theme", "details", "payments", "delivery", "done"] as Step[]).map(
          (s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                step === s || i < ["industry", "theme", "details", "payments", "delivery", "done"].indexOf(step)
                  ? "bg-accent"
                  : "bg-line"
              }`}
            />
          ),
        )}
      </div>

      {step === "industry" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">What do you sell?</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => setIndustry(ind.id)}
                className={`rounded-2xl border p-4 text-left text-sm font-semibold ${
                  industry === ind.id ? "border-accent bg-accent/10" : "border-line"
                }`}
              >
                {ind.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setStep("theme")}>Continue</Button>
        </section>
      )}

      {step === "theme" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Choose your store design</h2>
          {presets.length > 0 && (
            <p className="text-sm text-text-dim">Recommended for {industry}</p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {(presets.length
              ? presets.map((p) => ({ id: p.id, name: p.name, themeId: p.themeId }))
              : COMMERCE_THEME_IDS.map((id) => ({
                  id,
                  name: THEMES[id].name,
                  themeId: id,
                }))
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setThemeId(p.themeId)}
                className={`rounded-2xl border p-4 text-left ${
                  themeId === p.themeId ? "border-accent ring-2 ring-accent/30" : "border-line"
                }`}
              >
                <p className="font-semibold">{p.name}</p>
                <p className="mt-1 text-xs text-text-dim">{THEMES[p.themeId].tagline}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("industry")}>
              Back
            </Button>
            <Button onClick={() => setStep("details")}>Continue</Button>
          </div>
        </section>
      )}

      {step === "details" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Store details</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Store name"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
          <p className="text-sm text-text-dim">
            Products from your POS will appear online when marked visible. You can customize
            the homepage in the Store builder after launch.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("theme")}>
              Back
            </Button>
            <Button onClick={() => setStep("payments")}>Continue</Button>
          </div>
        </section>
      )}

      {step === "payments" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Payments</h2>
          <p className="text-sm text-text-dim">
            Configure PayHere, WebXPay, OnePay, LankaPay, Stripe, cash, and bank transfer in{" "}
            <Link href="/website" className="font-semibold text-accent">
              Website settings
            </Link>
            . COD is enabled by default for Sri Lankan merchants.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("details")}>
              Back
            </Button>
            <Button onClick={() => setStep("delivery")}>Continue</Button>
          </div>
        </section>
      )}

      {step === "delivery" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">Delivery</h2>
          <p className="text-sm text-text-dim">
            Set delivery zones in{" "}
            <Link href="/commerce/delivery" className="font-semibold text-accent">
              Commerce → Delivery
            </Link>
            . Default: pickup, local delivery, and islandwide.
          </p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep("payments")}>
              Back
            </Button>
            <Button onClick={publish} disabled={busy}>
              {busy ? "Publishing…" : "Publish my store"}
            </Button>
          </div>
        </section>
      )}

      {step === "done" && (
        <section className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-2xl">
            🎉
          </div>
          <h2 className="text-xl font-bold">Your store is ready</h2>
          <p className="font-mono text-sm text-accent">{storeUrl}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={storeUrl}
              target="_blank"
              className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink"
            >
              Preview store
            </Link>
            <Button variant="secondary" onClick={() => router.push("/commerce/builder")}>
              Customize
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
