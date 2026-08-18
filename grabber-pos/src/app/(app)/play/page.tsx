"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Session {
  id: string;
  name: string;
  ratePerHour: number;
  startTime: string;
}

export default function PlayPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  // Lazy initialiser keeps Date.now() out of render (the ticker updates it).
  const [now, setNow] = useState(() => Date.now());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/play")
      .then((r) => r.json())
      .then((j) => j.success && setSessions(j.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [load]);

  async function checkIn() {
    if (!Number(rate)) return;
    const res = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ratePerHour: Number(rate) }),
    });
    if ((await res.json()).success) {
      setName("");
      setRate("");
      load();
    }
  }

  async function checkOut(s: Session) {
    const res = await fetch(`/api/play/${s.id}`, { method: "POST" });
    const j = await res.json();
    if (j.success) {
      setMsg(`${s.name} checked out — ${formatMoney(j.data.charge)} (${j.data.minutes} min).`);
      load();
    }
  }

  function elapsed(s: Session) {
    const ms = Math.max(60_000, now - new Date(s.startTime).getTime());
    const min = Math.round(ms / 60_000);
    const charge = Math.ceil((ms / 3_600_000) * s.ratePerHour);
    return { label: `${Math.floor(min / 60)}h ${min % 60}m`, charge };
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader title="Play area" subtitle="Time-based sessions" />

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm">
            <span className="mb-1 block text-text-dim">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Guest / child name"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-text-dim">Rate / hour</span>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            />
          </label>
          <button
            onClick={checkIn}
            disabled={!Number(rate)}
            className="mt-auto rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
          >
            Check in
          </button>
        </div>
        {msg && (
          <p className="mt-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">
            {msg}
          </p>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {sessions.map((s, i) => {
            const e = elapsed(s);
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-xl border border-line bg-surface-1 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-strong">{s.name}</p>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase text-accent">
                    playing
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-dim">
                  {formatMoney(s.ratePerHour)}/hr · {e.label}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-lg font-bold text-accent">{formatMoney(e.charge)}</p>
                  <button
                    onClick={() => checkOut(s)}
                    className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-body transition hover:border-accent hover:text-accent"
                  >
                    Check out
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
