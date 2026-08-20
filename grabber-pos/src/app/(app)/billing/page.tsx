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
  payhere?: boolean;
};

function submitPayHereForm(checkout: {
  formAction?: string;
  formFields?: Record<string, string>;
}) {
  if (!checkout.formAction || !checkout.formFields) {
    throw new Error("Unexpected PayHere checkout response");
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.formAction;
  form.style.display = "none";
  for (const [k, v] of Object.entries(checkout.formFields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = k;
    input.value = v;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

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

  async function runBilling(plan: PlanTier, method: "invoice" | "payhere" | "request") {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, method }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (method === "payhere") {
        const checkout = json.data?.checkout as {
          mode?: string;
          url?: string;
          formAction?: string;
          formFields?: Record<string, string>;
        };
        if (checkout?.mode === "redirect" && checkout.url) {
          window.location.assign(checkout.url);
          return;
        }
        if (checkout?.mode === "form") {
          submitPayHereForm(checkout);
          return;
        }
        throw new Error("Unexpected checkout response");
      }

      if (method === "invoice") {
        setMsg(
          `Invoice ${json.data.ticketId} sent · LKR ${Number(json.data.amountLkr).toLocaleString("en-LK")}`,
        );
      } else {
        setMsg(`Upgrade request ${json.data.ticketId} sent to MyPoz HQ.`);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not complete billing action");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Billing"
        subtitle="Licence is enforced on the server. Email an invoice for bank transfer, or pay online with PayHere when configured."
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
            {plan.current ? (
              <Button className="mt-4 min-h-11" variant="secondary" disabled>
                Current plan
              </Button>
            ) : (
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="min-h-11"
                  disabled={busy}
                  onClick={() => void runBilling(plan.id, "invoice")}
                >
                  Email invoice
                </Button>
                <Button
                  className="min-h-11"
                  variant="secondary"
                  disabled={busy || !data?.payhere}
                  title={
                    data?.payhere
                      ? undefined
                      : "Set PAYHERE_MERCHANT_ID and SECRET"
                  }
                  onClick={() => void runBilling(plan.id, "payhere")}
                >
                  Pay with PayHere
                </Button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runBilling(plan.id, "request")}
                  className="text-xs text-text-dim hover:text-accent disabled:opacity-50"
                >
                  Request upgrade via HQ
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
