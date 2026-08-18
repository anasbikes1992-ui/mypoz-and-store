"use client";

import { useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

export default function PrivacyPage() {
  const [days, setDays] = useState("365");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function purge() {
    if (
      !window.confirm(
        `Clear customer name/mobile from sales & customers older than ${days} days?`,
      )
    ) {
      return;
    }
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/privacy/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number(days) || 365 }),
      });
      const j = await res.json();
      setMsg(
        j.success
          ? {
              ok: true,
              text: `Purged ${j.data?.sales ?? 0} sales, ${j.data?.customers ?? 0} customers.`,
            }
          : { ok: false, text: j.error ?? "Failed" },
      );
    } catch {
      setMsg({ ok: false, text: "Request failed" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <ModuleHeader
        title="Privacy"
        subtitle="Demo-safe PII retention purge"
      />

      <section className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <p className="text-sm text-text-body">
          Clears customer name and mobile from old sales records and the
          customers collection. Does not delete transaction totals.
        </p>
        <label className="mt-4 block text-xs text-text-dim">
          Older than (days)
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
          />
        </label>
        {msg && (
          <p
            className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => void purge()}
          className="mt-4 rounded-lg border border-danger px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
        >
          {pending ? "Purging…" : "Purge customer PII"}
        </button>
      </section>
    </div>
  );
}
