"use client";

import { useCallback, useEffect, useState } from "react";
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

interface UnitRow {
  id: string;
  name: string;
  rate: number;
  status: string;
}

interface OccupancyRow {
  bookingId: string;
  unitId: string | null;
  subject: string;
  customer: string;
  startDate: string;
  endDate: string;
  status: string;
}

const UNIT_TONE: Record<string, string> = {
  available: "bg-accent/15 text-accent",
  occupied: "bg-info/15 text-info",
  dirty: "bg-warn/15 text-warn",
  out_of_order: "bg-danger/15 text-danger",
};

export function BookingBoard({ type }: { type: BookingType }) {
  const cfg = BOOKING_CONFIG[type];
  const router = useRouter();
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"bookings" | "units" | "calendar">("bookings");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitRate, setNewUnitRate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/bookings?type=${type}`).then((r) => r.json()),
      fetch(`/api/booking-units?type=${type}`).then((r) => r.json()),
      fetch(`/api/booking-units?type=${type}&view=occupancy`).then((r) =>
        r.json(),
      ),
    ])
      .then(([b, u, o]) => {
        if (b.success) setRows(b.data);
        if (u.success) setUnits(u.data);
        if (o.success) setOccupancy(o.data);
      })
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function addUnit() {
    setMsg(null);
    const j = await (
      await fetch("/api/booking-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: newUnitName,
          rate: Number(newUnitRate) || 0,
        }),
      })
    ).json();
    if (!j.success) {
      setMsg(j.error || "Could not add unit");
      return;
    }
    setNewUnitName("");
    setNewUnitRate("");
    load();
  }

  async function setUnitStatus(id: string, status: string) {
    await fetch(`/api/booking-units/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title={cfg.title}
        subtitle={
          type === "room"
            ? "Rooms, housekeeping & folio"
            : "Rentals, assets & returns"
        }
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

      <div className="mt-4 flex gap-2 text-xs">
        {(
          [
            ["bookings", "Bookings"],
            ["units", type === "room" ? "Rooms" : "Assets"],
            ["calendar", "Occupancy"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              tab === id
                ? "bg-accent/15 text-accent"
                : "text-text-dim hover:text-text-strong"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {msg}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-center text-sm text-text-dim">Loading…</p>
      ) : tab === "units" ? (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border border-line bg-surface-1 p-3">
            <input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder={type === "room" ? "Room name" : "Asset / item"}
              className="min-w-[10rem] flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <input
              type="number"
              value={newUnitRate}
              onChange={(e) => setNewUnitRate(e.target.value)}
              placeholder={cfg.rateLabel}
              className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => void addUnit()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
            >
              Add
            </button>
          </div>
          {units.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
              No {type === "room" ? "rooms" : "assets"} yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {units.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-line bg-surface-1 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-text-strong">{u.name}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${UNIT_TONE[u.status] ?? ""}`}
                    >
                      {u.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-dim">
                    {formatMoney(u.rate)} / {cfg.unit.slice(0, -1) || "period"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {type === "room" && u.status === "dirty" && (
                      <button
                        type="button"
                        onClick={() => void setUnitStatus(u.id, "available")}
                        className="rounded border border-line px-2 py-0.5 text-[10px] hover:border-accent hover:text-accent"
                      >
                        Mark clean
                      </button>
                    )}
                    {u.status !== "out_of_order" && (
                      <button
                        type="button"
                        onClick={() => void setUnitStatus(u.id, "out_of_order")}
                        className="rounded border border-line px-2 py-0.5 text-[10px] hover:border-danger hover:text-danger"
                      >
                        Out of order
                      </button>
                    )}
                    {u.status === "out_of_order" && (
                      <button
                        type="button"
                        onClick={() => void setUnitStatus(u.id, "available")}
                        className="rounded border border-line px-2 py-0.5 text-[10px] hover:border-accent hover:text-accent"
                      >
                        Back to available
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : tab === "calendar" ? (
        <div className="mt-6 space-y-2">
          {occupancy.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
              No active occupancy.
            </p>
          ) : (
            occupancy.map((o) => (
              <Link
                key={o.bookingId}
                href={`${cfg.basePath}/${o.bookingId}`}
                className="flex items-center justify-between rounded-xl border border-line bg-surface-1 px-4 py-3 transition hover:border-accent/60"
              >
                <div>
                  <p className="font-medium text-text-strong">
                    {o.subject || cfg.subjectLabel}
                  </p>
                  <p className="text-xs text-text-dim">
                    {o.customer || "—"} · {formatDate(o.startDate)} →{" "}
                    {formatDate(o.endDate)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${BOOKING_STATUS_TONE[o.status] ?? ""}`}
                >
                  {o.status}
                </span>
              </Link>
            ))
          )}
        </div>
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
