"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Session {
  id: string;
  name: string;
  zone: string;
  ratePerHour: number;
  startTime: string;
  charge?: number;
  minutes?: number;
}

export default function PlayPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [zones, setZones] = useState<string[]>(["Main floor"]);
  const [maxCapacity, setMaxCapacity] = useState(20);
  const [name, setName] = useState("");
  const [zone, setZone] = useState("Main floor");
  const [rate, setRate] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/play")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setSessions(j.data.sessions ?? []);
        if (j.data.zones?.length) {
          setZones(j.data.zones);
          setZone((z) => (j.data.zones.includes(z) ? z : j.data.zones[0]));
        }
        if (j.data.maxCapacity) setMaxCapacity(j.data.maxCapacity);
        if (j.data.defaultRate) {
          setRate((r) => r || String(j.data.defaultRate));
        }
      })
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
      body: JSON.stringify({ name, zone, ratePerHour: Number(rate) }),
    });
    const j = await res.json();
    if (j.success) {
      setName("");
      setMsg(null);
      load();
    } else {
      setMsg(j.error ?? "Check-in failed");
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

  const atCapacity = sessions.length >= maxCapacity;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Play area"
        subtitle={`${sessions.length} / ${maxCapacity} on floor`}
      />

      {atCapacity && (
        <p className="mt-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-warn">
          At capacity — check out a session before new check-ins.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <span className="mb-1 block text-text-dim">Zone</span>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
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
            disabled={!Number(rate) || atCapacity}
            className="mt-auto rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
          >
            Check in
          </button>
        </div>
        {msg && (
          <p
            className={`mt-3 rounded-lg border px-4 py-2 text-sm ${
              msg.includes("capacity") || msg.includes("failed")
                ? "border-danger/40 bg-danger/10 text-danger"
                : "border-accent/40 bg-accent/10 text-accent"
            }`}
          >
            {msg}
          </p>
        )}
        <p className="mt-2 text-xs text-text-dim">
          Zones and capacity are configured in Settings → Play area.
        </p>
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
                    {s.zone}
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
