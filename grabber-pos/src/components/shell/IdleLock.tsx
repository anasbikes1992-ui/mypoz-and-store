"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

/** Locks the POS UI after idleLockMinutes of no activity; unlock with manager PIN. */
export function IdleLock() {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const minutesRef = useRef(10);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (lockedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const ms = Math.max(1, minutesRef.current) * 60_000;
    timerRef.current = setTimeout(() => {
      lockedRef.current = true;
      setLocked(true);
    }, ms);
  }, []);

  useEffect(() => {
    fetch("/api/permissions")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.idleLockMinutes) {
          minutesRef.current = Number(j.data.idleLockMinutes) || 10;
        }
      })
      .catch(() => undefined)
      .finally(schedule);
  }, [schedule]);

  useEffect(() => {
    if (locked) return;
    const onActivity = () => schedule();
    const evts = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    for (const e of evts) window.addEventListener(e, onActivity, { passive: true });
    schedule();
    return () => {
      for (const e of evts) window.removeEventListener(e, onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [locked, schedule]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, action: "verify" }),
      });
      const j = await res.json();
      if (!j.success || !j.data?.valid) {
        setError(j.error ?? "Invalid PIN");
        return;
      }
      setPin("");
      lockedRef.current = false;
      setLocked(false);
    } catch {
      setError("Could not verify PIN");
    } finally {
      setPending(false);
    }
  }

  if (!locked) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay-strong backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Session locked"
    >
      <form
        onSubmit={unlock}
        className="w-full max-w-sm rounded-2xl border border-line bg-surface-1 p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-text-strong">Session locked</h2>
        <p className="mt-1 text-sm text-text-dim">
          Enter the manager PIN to continue.
        </p>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder="Manager PIN"
          className="mt-4 w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-text-strong outline-none focus:border-accent"
        />
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <Button
          type="submit"
          className="mt-4 w-full"
          disabled={pending || !pin.trim()}
        >
          {pending ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}
