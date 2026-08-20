"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { isSupabaseEnabled } from "@/lib/supabase/config";

interface LiveOrder {
  id: string;
  receiptNo: string;
  customerName: string;
  total: number;
  createdAt: string;
  fulfillmentStatus?: string;
}

const SEEN_KEY = "mypoz-seen-online-orders";

function loadSeen(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-80)));
}

export function OnlineOrderAlerts() {
  const [toast, setToast] = useState<LiveOrder | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    seen.current = loadSeen();
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch("/api/commerce/orders/live");
        const json = await res.json();
        if (!json.success || cancelled) return;
        const orders = (json.data ?? []) as LiveOrder[];
        if (!primed.current) {
          for (const o of orders) seen.current.add(o.id);
          saveSeen(seen.current);
          primed.current = true;
          return;
        }
        const fresh = orders.find((o) => !seen.current.has(o.id));
        if (fresh) {
          seen.current.add(fresh.id);
          saveSeen(seen.current);
          setToast(fresh);
        }
      } catch {
        // ignore
      }
    }

    void tick();
    const poll = window.setInterval(() => void tick(), 8000);

    let channel: { unsubscribe: () => void } | null = null;
    if (isSupabaseEnabled) {
      void import("@/lib/supabase/client")
        .then(({ createClient }) => {
          if (cancelled) return;
          const client = createClient();
          channel = client
            .channel("online-orders")
            .on(
              "postgres_changes",
              { event: "INSERT", schema: "public", table: "sales" },
              (payload) => {
                const row = payload.new as { id?: string; source?: string; receipt_no?: string; customer_name?: string; total?: number };
                if (row.source !== "ONLINE_STORE" || !row.id) return;
                if (seen.current.has(row.id)) return;
                seen.current.add(row.id);
                saveSeen(seen.current);
                setToast({
                  id: row.id,
                  receiptNo: row.receipt_no || row.id,
                  customerName: row.customer_name || "Online customer",
                  total: Number(row.total || 0),
                  createdAt: new Date().toISOString(),
                });
              },
            )
            .subscribe();
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      channel?.unsubscribe();
    };
  }, []);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm rounded-2xl border border-accent bg-surface-1 p-4 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">New online order</p>
      <p className="mt-1 font-mono text-sm font-semibold">{toast.receiptNo}</p>
      <p className="text-sm text-text-dim">
        {toast.customerName} · {formatMoney(toast.total)}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-lg px-3 py-1.5 text-xs text-text-dim"
          onClick={() => setToast(null)}
        >
          Dismiss
        </button>
        <Link
          href={`/commerce/orders/${toast.receiptNo || toast.id}`}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
          onClick={() => setToast(null)}
        >
          View order
        </Link>
      </div>
    </div>
  );
}
