"use client";

import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  activeMemberDiscount,
  type MembershipRecord,
} from "@/lib/memberships";
import {
  normalizePriceTier,
  PRICE_TIER_LABELS,
  type PriceTier,
} from "@/lib/pricing-tiers";
import { formatMoney } from "@/lib/format";

interface CustomerRow {
  id: string;
  name?: string;
  mobile?: string;
  points?: number;
  creditLimit?: number;
  priceTier?: string;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  mobile: string;
  points: number;
  memberDiscountPercent?: number | null;
  priceTier?: PriceTier | null;
  creditLimit?: number;
}

export function CustomerPicker({
  onSelect,
}: {
  onSelect: (c: SelectedCustomer) => void;
}) {
  const [q, setQ] = useState("");
  const [all, setAll] = useState<CustomerRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const debounced = useDebounce(q, 150);

  useEffect(() => {
    fetch("/api/collections/customers")
      .then((r) => r.json())
      .then((j) => j.success && setAll(j.data))
      .catch(() => undefined);
    fetch("/api/collections/memberships")
      .then((r) => r.json())
      .then((j) => j.success && setMemberships(j.data ?? []))
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
          {results.map((c) => {
            const memberPct = activeMemberDiscount(memberships, c.id);
            const tier = normalizePriceTier(c.priceTier || "retail");
            const credit = Number(c.creditLimit) || 0;
            return (
              <li key={c.id}>
                <button
                  onClick={() => {
                    onSelect({
                      id: c.id,
                      name: String(c.name ?? ""),
                      mobile: String(c.mobile ?? ""),
                      points: Number(c.points) || 0,
                      memberDiscountPercent: memberPct,
                      priceTier: tier,
                      creditLimit: credit,
                    });
                    setQ("");
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                >
                  <span className="min-w-0 truncate text-text-strong">
                    {c.name || "—"}
                    {tier !== "retail" && (
                      <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        {PRICE_TIER_LABELS[tier]}
                      </span>
                    )}
                    {memberPct != null && (
                      <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        Member −{memberPct}%
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-text-dim">
                    {c.mobile} · {Number(c.points) || 0} pts
                    {credit > 0 ? ` · CR ${formatMoney(credit)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
