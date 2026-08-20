"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Sale } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { saleToTicketText } from "@/lib/receipt";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import {
  BOOKING_CONFIG,
  BOOKING_STATUSES,
  type BookingType,
} from "@/lib/bookings-config";

interface Extra {
  id: string;
  description: string;
  amount: number;
}
interface Booking {
  id: string;
  type: BookingType;
  customer: string;
  phone: string;
  subject: string;
  rate: number;
  startDate: string;
  endDate: string;
  deposit: number;
  overdueFee?: number;
  depositDisposition?: "held" | "refunded" | "forfeited";
  status: string;
  extras: Extra[];
}

function daysOverdue(endDate: string): number {
  if (!endDate) return 0;
  const today = new Date().toISOString().slice(0, 10);
  if (endDate >= today) return 0;
  const end = new Date(endDate + "T00:00:00");
  const startOfToday = new Date(today + "T00:00:00");
  return Math.max(
    1,
    Math.round((startOfToday.getTime() - end.getTime()) / 86_400_000),
  );
}

function suggestOverdue(rate: number, endDate: string): number {
  const days = daysOverdue(endDate);
  if (days <= 0) return 0;
  return Math.round(days * (Number(rate) || 0) * 0.1);
}

export function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [b, setB] = useState<Booking | null>(null);
  const [xDesc, setXDesc] = useState("");
  const [xAmt, setXAmt] = useState("");
  const [done, setDone] = useState<Sale | null>(null);

  const load = useCallback(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((j) => j.success && setB(j.data));
  }, [id]);
  useEffect(() => load(), [load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const j = await (
      await fetch(`/api/bookings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
    ).json();
    if (j.success && action !== "settle") setB(j.data);
    return j;
  }

  const lateDays = b ? daysOverdue(b.endDate) : 0;
  const suggested = b ? suggestOverdue(b.rate, b.endDate) : 0;
  const isPastDue = lateDays > 0 && b?.status === "active";

  const totals = useMemo(() => {
    if (!b) return { duration: 0, stayCharge: 0, extras: 0, overdue: 0, forfeit: 0, total: 0 };
    let duration = 0;
    if (b.startDate && b.endDate) {
      const days = Math.round(
        (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
          86_400_000,
      );
      duration = Math.max(1, days);
    }
    const stayCharge = duration * (Number(b.rate) || 0);
    const extras = b.extras.reduce((s, e) => s + e.amount, 0);
    const overdue =
      Number(b.overdueFee) > 0
        ? Number(b.overdueFee)
        : suggested;
    const forfeit =
      b.depositDisposition === "forfeited"
        ? Math.max(0, Number(b.deposit) || 0)
        : 0;
    return {
      duration,
      stayCharge,
      extras,
      overdue,
      forfeit,
      total: stayCharge + extras + overdue + forfeit,
    };
  }, [b, suggested]);

  async function settle() {
    // Persist suggested overdue before settle if unset.
    if (b && suggested > 0 && !(Number(b.overdueFee) > 0)) {
      await act("meta", { meta: { overdueFee: suggested } });
    }
    const j = await act("settle", {
      paymentMethod: "cash",
      cashReceived: totals.total,
    });
    if (j.success) setDone(j.data as Sale);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-3xl text-accent">
          ✓
        </div>
        <h1 className="mt-4 text-lg font-semibold text-text-strong">
          {done.id} — checked out
        </h1>
        <p className="mt-1 text-3xl font-bold text-accent">
          {formatMoney(done.total)}
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() =>
              fetch("/api/print", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  station: "RECEIPT",
                  content: saleToTicketText(done),
                }),
              }).catch(() => undefined)
            }
            className="flex-1 rounded-lg border border-line py-2.5 text-sm text-text-body transition hover:border-accent hover:text-accent"
          >
            Print receipt
          </button>
          <button
            onClick={() => router.push(BOOKING_CONFIG[b?.type ?? "room"].basePath)}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!b) {
    return <p className="p-10 text-center text-sm text-text-dim">Loading…</p>;
  }
  const cfg = BOOKING_CONFIG[b.type];
  const disposition = b.depositDisposition ?? "held";

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <ModuleHeader
        title={`${cfg.title} · ${b.subject || b.id}`}
        subtitle={b.customer || "New booking"}
      />

      {isPastDue && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Overdue by {lateDays} day{lateDays === 1 ? "" : "s"}
          {suggested > 0
            ? ` · suggested fee ${formatMoney(suggested)}`
            : ""}
          . Apply before settle or it will be added automatically.
        </div>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-line bg-surface-1 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer" value={b.customer} onCommit={(v) => act("meta", { meta: { customer: v } })} />
            <Field label="Phone" value={b.phone} onCommit={(v) => act("meta", { meta: { phone: v } })} />
            <Field label={cfg.subjectLabel} value={b.subject} onCommit={(v) => act("meta", { meta: { subject: v } })} />
            <NumField label={cfg.rateLabel} value={b.rate} onCommit={(v) => act("meta", { meta: { rate: v } })} />
            <DateField label="From" value={b.startDate} onCommit={(v) => act("meta", { meta: { startDate: v } })} />
            <DateField label="To" value={b.endDate} onCommit={(v) => act("meta", { meta: { endDate: v } })} />
            <NumField label="Deposit (refundable)" value={b.deposit} onCommit={(v) => act("meta", { meta: { deposit: v } })} />
            <NumField
              label="Overdue fee"
              value={b.overdueFee ?? 0}
              onCommit={(v) => act("meta", { meta: { overdueFee: Number(v) || 0 } })}
            />
          </div>
          <div className="mt-3">
            <span className="mb-1 block text-sm text-text-dim">Status</span>
            <div className="flex gap-1">
              {BOOKING_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => act("meta", { meta: { status: s } })}
                  className={`rounded-full px-2.5 py-1 text-xs capitalize transition ${
                    b.status === s
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-text-dim hover:text-text-body"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {b.deposit > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mb-2 text-sm font-medium text-text-strong">
                Deposit · {disposition}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    act("meta", { meta: { depositDisposition: "refunded" } })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    disposition === "refunded"
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-text-body hover:border-accent hover:text-accent"
                  }`}
                >
                  Refund deposit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    act("meta", { meta: { depositDisposition: "forfeited" } })
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                    disposition === "forfeited"
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-line text-text-body hover:border-danger hover:text-danger"
                  }`}
                >
                  Forfeit deposit
                </button>
                {disposition !== "held" && (
                  <button
                    type="button"
                    onClick={() =>
                      act("meta", { meta: { depositDisposition: "held" } })
                    }
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-text-dim transition hover:text-text-body"
                  >
                    Reset to held
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Extras */}
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium text-text-strong">Extras</p>
            <div className="flex gap-2">
              <input
                value={xDesc}
                onChange={(e) => setXDesc(e.target.value)}
                placeholder="e.g. Room service"
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
              />
              <input
                type="number"
                value={xAmt}
                onChange={(e) => setXAmt(e.target.value)}
                placeholder="Amount"
                className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
              />
              <button
                onClick={async () => {
                  if (!xDesc.trim()) return;
                  await act("addExtra", { description: xDesc.trim(), amount: Number(xAmt) || 0 });
                  setXDesc("");
                  setXAmt("");
                }}
                className="rounded-lg border border-line px-3 text-sm text-text-body transition hover:border-accent hover:text-accent"
              >
                Add
              </button>
            </div>
            {b.extras.length > 0 && (
              <ul className="mt-2 space-y-1">
                {b.extras.map((e) => (
                  <li key={e.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-body">{e.description}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-text-strong">{formatMoney(e.amount)}</span>
                      <button
                        onClick={() => act("removeExtra", { extraId: e.id })}
                        className="text-text-dim transition hover:text-danger"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Summary */}
        <section className="h-fit rounded-xl border border-line bg-surface-1 p-5">
          <h2 className="mb-3 font-semibold text-text-strong">Summary</h2>
          <Row label={`${totals.duration} ${cfg.unit} × ${formatMoney(b.rate)}`} value={formatMoney(totals.stayCharge)} />
          {totals.extras > 0 && <Row label="Extras" value={formatMoney(totals.extras)} />}
          {totals.overdue > 0 && (
            <Row label="Overdue fee" value={formatMoney(totals.overdue)} />
          )}
          {totals.forfeit > 0 && (
            <Row label="Deposit forfeited" value={formatMoney(totals.forfeit)} />
          )}
          {b.deposit > 0 && disposition !== "forfeited" && (
            <Row
              label={`Deposit (${disposition})`}
              value={formatMoney(b.deposit)}
              muted
            />
          )}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <p className="font-semibold text-text-strong">To pay</p>
            <p className="text-xl font-bold text-accent">{formatMoney(totals.total)}</p>
          </div>
          <button
            onClick={settle}
            disabled={totals.total <= 0}
            className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
          >
            {b.type === "room" ? "Check out & settle" : "Return & settle"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-text-dim">{label}</span>
      <span className={muted ? "text-text-dim" : "text-text-body"}>{value}</span>
    </div>
  );
}

function Field({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onCommit(v)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}

function NumField({ label, value, onCommit }: { label: string; value: number; onCommit: (v: string) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        type="number"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => Number(v) !== value && onCommit(v)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}

function DateField({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  return (
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onCommit(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}
