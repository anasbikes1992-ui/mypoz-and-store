"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface DeliveryOrder {
  id: string;
  customer: string;
  phone: string;
  address: string;
  driver: string;
  status: string;
  total: number;
  fulfilment?: string;
  source?: string;
  receiptNo?: string | null;
  note?: string;
}

const STATUS_TONE: Record<string, string> = {
  new: "bg-info/15 text-info",
  preparing: "bg-warn/15 text-warn",
  out: "bg-accent/15 text-accent",
  delivered: "bg-surface-3 text-text-dim",
};

export default function DeliveryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/delivery/orders")
      .then((r) => r.json())
      .then((j) => j.success && setOrders(j.data))
      .finally(() => setLoading(false));
  }, []);

  async function newOrder() {
    setCreating(true);
    const j = await (await fetch("/api/delivery/orders", { method: "POST" })).json();
    if (j.success) router.push(`/delivery/${j.data.id}`);
    else setCreating(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Delivery"
        subtitle="Orders out for delivery"
        actions={
          <div className="flex gap-2">
            <Link
              href="/drivers"
              className="rounded-lg border border-line px-4 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
            >
              Drivers
            </Link>
            <button
              onClick={newOrder}
              disabled={creating}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
            >
              {creating ? "Creating…" : "+ New delivery"}
            </button>
          </div>
        }
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          No active deliveries. Start a new one.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                href={`/delivery/${o.id}`}
                className="block rounded-xl border border-line bg-surface-1 p-4 transition hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-strong">
                    {o.customer || o.id}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${STATUS_TONE[o.status] ?? ""}`}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-text-dim">
                  {o.address || "No address"} {o.phone ? `· ${o.phone}` : ""}
                </p>
                {(o.source === "storefront" || o.fulfilment || o.receiptNo) && (
                  <p className="mt-1 text-[11px] font-medium text-tint-teal">
                    {o.source === "storefront" ? "Web order" : "Order"}
                    {o.fulfilment ? ` · ${o.fulfilment}` : ""}
                    {o.receiptNo ? ` · ${o.receiptNo}` : ""}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-text-dim">
                    {o.driver ? `🛵 ${o.driver}` : "No driver"}
                  </span>
                  <span className="font-semibold text-accent">
                    {formatMoney(o.total)}
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
