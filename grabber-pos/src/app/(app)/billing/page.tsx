"use client";

import { useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";
import { PLAN_NAMES, type PlanTier } from "@/lib/plans";

type PlanCard = {
  id: PlanTier;
  name: string;
  priceLkr: number;
  blurb: string;
  current: boolean;
};

type BillingPayload = {
  license: { plan: PlanTier; expiry: string; extras: string[] };
  brand: { businessName: string };
  plans: PlanCard[];
};

export default function BillingPage() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/billing")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setData(j.data);
      });
  }, []);

  async function requestPlan(plan: PlanTier) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setMsg(`Upgrade request ${json.data.ticketId} sent to MyPoz HQ.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Billing"
        subtitle="Licence is enforced on the server. Card collection stays with HQ until a payment processor is connected."
      />
      {data ? (
        <p className="mt-4 text-sm text-text-dim">
          {data.brand.businessName} · {PLAN_NAMES[data.license.plan]}
          {data.license.expiry ? ` · expires ${data.license.expiry}` : " · no expiry set"}
        </p>
      ) : null}
      {msg ? <p className="mt-3 text-sm text-accent">{msg}</p> : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {(data?.plans ?? []).map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-3xl border p-5 ${
              plan.current ? "border-accent bg-accent/5" : "border-line bg-surface-1"
            }`}
          >
            <h2 className="text-lg font-semibold text-text-strong">{plan.name}</h2>
            <p className="mt-2 font-mono text-xl text-accent">
              LKR {plan.priceLkr.toLocaleString("en-LK")}
              <span className="text-xs text-text-dim"> / month</span>
            </p>
            <p className="mt-2 flex-1 text-sm text-text-dim">{plan.blurb}</p>
            <Button
              className="mt-4 min-h-11"
              variant={plan.current ? "secondary" : "primary"}
              disabled={busy || plan.current}
              onClick={() => void requestPlan(plan.id)}
            >
              {plan.current ? "Current plan" : "Request upgrade"}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
