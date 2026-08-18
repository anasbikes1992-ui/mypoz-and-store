"use client";

import { useEffect, useState } from "react";

const KEY = "grabber-pos-display";

interface DisplayPayload {
  total: number;
  lines: { name: string; qty: number; amount: number }[];
  businessName: string;
}

export default function CustomerDisplayPage() {
  const [data, setData] = useState<DisplayPayload>({
    total: 0,
    lines: [],
    businessName: "GRABBER POS",
  });

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as DisplayPayload;
        setData(parsed);
      } catch {
        // ignore
      }
    }
    read();
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) read();
    }
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(read, 800);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 px-8 py-6">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          Customer display
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {data.businessName || "Store"}
        </h1>
      </header>

      <main className="flex flex-1 flex-col px-8 py-8">
        <ul className="flex-1 space-y-3 overflow-y-auto text-lg">
          {data.lines.length === 0 ? (
            <li className="text-zinc-500">Waiting for cart…</li>
          ) : (
            data.lines.map((l, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between border-b border-zinc-900 pb-2"
              >
                <span>
                  {l.qty}× {l.name}
                </span>
                <span className="font-mono tabular-nums">
                  {l.amount.toFixed(2)}
                </span>
              </li>
            ))
          )}
        </ul>

        <div className="mt-8 border-t border-zinc-800 pt-6 text-right">
          <p className="text-sm uppercase tracking-wider text-zinc-500">
            Total due
          </p>
          <p className="mt-2 font-mono text-6xl font-bold tabular-nums text-emerald-400 sm:text-7xl">
            {data.total.toFixed(2)}
          </p>
        </div>
      </main>
    </div>
  );
}
