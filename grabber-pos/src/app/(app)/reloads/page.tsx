"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface ReloadEntry {
  id: string;
  provider: string;
  mobile: string;
  amount: number;
  createdAt: string;
}

const PROVIDERS = ["Dialog", "Mobitel", "Hutch", "Airtel"];

export default function ReloadsPage() {
  const [provider, setProvider] = useState("Dialog");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [recent, setRecent] = useState<ReloadEntry[]>([]);

  function load() {
    fetch("/api/reloads")
      .then((r) => r.json())
      .then((j) => j.success && setRecent(j.data))
      .catch(() => undefined);
  }
  useEffect(load, []);

  async function sell() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/reloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, mobile, amount: Number(amount) }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Failed" });
        return;
      }
      setMsg({ ok: true, text: `Sold ${provider} reload of ${formatMoney(Number(amount))} to ${mobile}.` });
      setMobile("");
      setAmount("");
      load();
    } finally {
      setPending(false);
    }
  }

  const quick = [50, 100, 200, 500, 1000];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ModuleHeader title="Reloads" subtitle="Mobile top-ups" />

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-text-dim">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            >
              {PROVIDERS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-text-dim">Mobile number</span>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-text-dim">Amount</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
            >
              {formatMoney(q)}
            </button>
          ))}
        </div>

        {msg && (
          <p
            className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
              msg.ok
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {msg.text}
          </p>
        )}

        <button
          onClick={sell}
          disabled={pending || !mobile || !Number(amount)}
          className="mt-4 w-full rounded-lg bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
        >
          {pending ? "Selling…" : `Sell reload${amount ? ` · ${formatMoney(Number(amount))}` : ""}`}
        </button>
      </div>

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium text-text-strong">Recent reloads</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {recent.map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.02, 0.2) }}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {r.provider} · {r.mobile}
                  </p>
                  <p className="text-xs text-text-dim">{formatDateTime(r.createdAt)}</p>
                </div>
                <p className="font-semibold text-accent">{formatMoney(r.amount)}</p>
              </motion.li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
