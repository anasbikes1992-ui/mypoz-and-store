"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Entry {
  id: string;
  customerId: string;
  kind: string;
  points: number;
  note: string;
  saleId?: string;
  createdAt: string;
}

export default function LoyaltyPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/loyalty")
      .then((r) => r.json())
      .then((j) => j.success && setEntries(j.data.entries ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ModuleHeader
        title="Loyalty ledger"
        subtitle="Recent earn · redeem · adjust activity"
        actions={
          <Link
            href="/customers"
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-body transition hover:border-accent hover:text-accent"
          >
            Customers
          </Link>
        }
      />

      {loading && entries.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-dim">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-8 text-center text-sm text-text-dim">
          No ledger entries yet. Points move when you settle a sale or adjust a customer.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-surface-1">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium capitalize text-text-strong">
                  {e.kind}
                  <Link
                    href={`/customers/${e.customerId}`}
                    className="ml-2 font-normal text-accent hover:underline"
                  >
                    {e.customerId}
                  </Link>
                </p>
                <p className="mt-0.5 text-text-dim">
                  {e.note || "—"}
                  {e.saleId ? ` · ${e.saleId}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-text-dim">
                  {new Date(e.createdAt).toLocaleString()}
                </p>
              </div>
              <p
                className={`shrink-0 font-semibold ${
                  e.kind === "redeem" || e.kind === "expire" || e.points < 0
                    ? "text-danger"
                    : "text-accent"
                }`}
              >
                {e.kind === "redeem" || e.kind === "expire"
                  ? `−${e.points}`
                  : e.points > 0 && e.kind !== "adjust"
                    ? `+${e.points}`
                    : e.points > 0
                      ? `+${e.points}`
                      : String(e.points)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
