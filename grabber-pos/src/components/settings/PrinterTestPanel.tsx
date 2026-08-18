"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Station = "RECEIPT" | "KOT" | "BOT";

export function PrinterTestPanel() {
  const [station, setStation] = useState<Station>("RECEIPT");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function testPrint() {
    setPending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station,
          content: `GRABBER POS\nTest ticket (${station})\n${new Date().toLocaleString()}`,
        }),
      });
      const j = await res.json();
      setMsg(
        j.success
          ? { ok: true, text: `Test sent to ${station}.` }
          : { ok: false, text: j.error ?? "Print failed" },
      );
    } catch {
      setMsg({ ok: false, text: "Could not reach print API" });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-5">
      <h2 className="mb-3 text-sm font-semibold text-text-strong">
        Printer test
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-text-dim">Station</span>
          <select
            value={station}
            onChange={(e) => setStation(e.target.value as Station)}
            className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none transition duration-150 focus:border-accent"
          >
            <option value="RECEIPT">Receipt</option>
            <option value="KOT">KOT</option>
            <option value="BOT">BOT</option>
          </select>
        </label>
        <Button variant="secondary" disabled={pending} onClick={testPrint}>
          {pending ? "Sending…" : "Print test ticket"}
        </Button>
      </div>
      {msg && (
        <p
          className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}
