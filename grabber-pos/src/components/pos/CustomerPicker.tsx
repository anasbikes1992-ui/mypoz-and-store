"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerRow {
  id: string;
  name?: string;
  mobile?: string;
  points?: number;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  mobile: string;
  points: number;
}

export function CustomerPicker({
  onSelect,
}: {
  onSelect: (c: SelectedCustomer) => void;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<CustomerRow[]>([]);
  const debounced = useDebounce(q, 150);

  useEffect(() => {
    fetch("/api/collections/customers")
      .then((r) => r.json())
      .then((j) => j.success && setAll(j.data))
      .catch(() => undefined);
  }, []);

  const term = debounced.trim().toLowerCase();
  const results = term
    ? all
        .filter(
          (c) =>
            String(c.name ?? "").toLowerCase().includes(term) ||
            String(c.mobile ?? "").includes(term),
        )
        .slice(0, 6)
    : [];

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search a loyalty customer…"
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
      />
      {results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface-3 shadow-xl">
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => {
                  onSelect({
                    id: c.id,
                    name: String(c.name ?? ""),
                    mobile: String(c.mobile ?? ""),
                    points: Number(c.points) || 0,
                  });
                  setQ("");
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-surface-2"
              >
                <span className="text-text-strong">{c.name || "—"}</span>
                <span className="text-xs text-text-dim">
                  {c.mobile} · {Number(c.points) || 0} pts
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
