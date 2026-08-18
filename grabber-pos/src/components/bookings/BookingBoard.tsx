"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { formatMoney, formatDate } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import {
  BOOKING_CONFIG,
  BOOKING_STATUS_TONE,
  type BookingType,
} from "@/lib/bookings-config";

interface BookingRow {
  id: string;
  customer: string;
  subject: string;
  startDate: string;
  endDate: string;
  status: string;
  total: number;
}

export function BookingBoard({ type }: { type: BookingType }) {
  const cfg = BOOKING_CONFIG[type];
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings?type=${type}`)
      .then((r) => r.json())
      .then((j) => j.success && setRows(j.data))
      .finally(() => setLoading(false));
  }, [type]);

  async function create() {
    setCreating(true);
    const j = await (
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      })
    ).json();
    if (j.success) router.push(`${cfg.basePath}/${j.data.id}`);
    else setCreating(false);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={cfg.title}
        subtitle={type === "room" ? "Room bookings" : "Active rentals"}
        actions={
          <button
            onClick={create}
            disabled={creating}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-50"
          >
            {creating ? "Creating…" : `+ ${cfg.newVerb}`}
          </button>
        }
      />

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-line p-10 text-center text-sm text-text-dim">
          Nothing active. Start a new one.
        </p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link
                href={`${cfg.basePath}/${b.id}`}
                className="block rounded-xl border border-line bg-surface-1 p-4 transition hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text-strong">
                    {b.subject || cfg.subjectLabel}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${BOOKING_STATUS_TONE[b.status] ?? ""}`}
                  >
                    {b.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-text-dim">
                  {b.customer || "—"}
                  {b.startDate ? ` · ${formatDate(b.startDate)}` : ""}
                  {b.endDate ? ` → ${formatDate(b.endDate)}` : ""}
                </p>
                <p className="mt-3 text-right font-semibold text-accent">
                  {formatMoney(b.total)}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
