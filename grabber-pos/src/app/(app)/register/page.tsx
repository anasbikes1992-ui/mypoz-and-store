"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { Button } from "@/components/ui/Button";

interface Shift {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  openedBy: string;
  closedBy: string | null;
  openingFloat: number;
  closingDeclared: number | null;
  expectedCash: number | null;
  variance: number | null;
  cashSalesTotal: number;
  cardSalesTotal: number;
  voidTotal: number;
  saleIds: string[];
  note: string | null;
}

export default function RegisterPage() {
  const [open, setOpen] = useState<Shift | null>(null);
  const [history, setHistory] = useState<Shift[]>([]);
  const [floatAmt, setFloatAmt] = useState("0");
  const [declared, setDeclared] = useState("0");
  const [openedBy, setOpenedBy] = useState("cashier");
  const [x, setX] = useState<{ shift: Shift; expectedCash: number } | null>(null);
  const [z, setZ] = useState<Shift | null>(null);
  const [varianceAlert, setVarianceAlert] = useState<{
    amount: number;
    expected: number;
  } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const VARIANCE_ABS = 100;
  const VARIANCE_PCT = 0.01;

  const load = useCallback(() => {
    fetch("/api/register")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setOpen(j.data.open);
        setHistory(j.data.history ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  async function act(action: "open" | "close" | "xreport") {
    setPending(true);
    setMsg(null);
    try {
      const body =
        action === "open"
          ? { action, openedBy, openingFloat: Number(floatAmt) || 0 }
          : action === "close"
            ? {
                action,
                closedBy: openedBy,
                closingDeclared: Number(declared) || 0,
              }
            : { action };

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Failed" });
        return;
      }
      if (action === "xreport") {
        setX(j.data);
        setVarianceAlert(null);
        setMsg({ ok: true, text: "X-report ready." });
      } else if (action === "close") {
        setZ(j.data);
        setX(null);
        const variance = Number(j.data.variance) || 0;
        const expected = Number(j.data.expectedCash) || 0;
        const threshold = Math.max(VARIANCE_ABS, Math.abs(expected) * VARIANCE_PCT);
        if (Math.abs(variance) > threshold) {
          setVarianceAlert({ amount: variance, expected });
        } else {
          setVarianceAlert(null);
        }
        setMsg({ ok: true, text: `Z-report ${j.data.id} closed.` });
      } else {
        setZ(null);
        setX(null);
        setVarianceAlert(null);
        setMsg({ ok: true, text: `Shift ${j.data.id} opened.` });
      }
      load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ModuleHeader
        title="Register"
        subtitle="Open / close shift · X & Z reports"
      />

      {msg && (
        <p
          className={`mt-6 rounded-lg border px-4 py-2 text-sm ${
            msg.ok
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}

      {varianceAlert && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-danger/50 bg-danger/15 px-5 py-4"
        >
          <p className="text-sm font-semibold text-danger">
            Cash variance alert
          </p>
          <p className="mt-1 text-lg font-bold text-danger">
            {formatMoney(varianceAlert.amount)}
          </p>
          <p className="mt-1 text-xs text-text-dim">
            Declared cash differs from expected ({formatMoney(varianceAlert.expected)})
            by more than Rs 100 or 1%. Count the drawer again before signing off.
          </p>
        </div>
      )}

      <section className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        {open ? (
          <>
            <p className="text-sm text-text-strong">
              Open shift <span className="text-accent">{open.id}</span>
            </p>
            <p className="mt-1 text-xs text-text-dim">
              Opened {formatDateTime(open.openedAt)} by {open.openedBy} · float{" "}
              {formatMoney(open.openingFloat)}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Cash sales" value={formatMoney(open.cashSalesTotal)} />
              <Stat label="Card sales" value={formatMoney(open.cardSalesTotal)} />
              <Stat label="Voids" value={formatMoney(open.voidTotal)} />
              <Stat label="Sales" value={String(open.saleIds.length)} />
            </dl>

            <div className="mt-5 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-text-dim">Closing declared</span>
                <input
                  type="number"
                  min={0}
                  value={declared}
                  onChange={(e) => setDeclared(e.target.value)}
                  className="w-36 rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                />
              </label>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => act("xreport")}
              >
                X-report
              </Button>
              <Button
                variant="secondary"
                disabled={pending}
                onClick={async () => {
                  setMsg(null);
                  try {
                    const res = await fetch("/api/print", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ kick: true }),
                    });
                    const j = await res.json();
                    setMsg({
                      ok: !!j.success,
                      text: j.success
                        ? "Drawer kick sent"
                        : (j.error ?? "Drawer failed"),
                    });
                  } catch {
                    setMsg({ ok: false, text: "Drawer request failed" });
                  }
                }}
              >
                Open drawer
              </Button>
              <Button disabled={pending} onClick={() => act("close")}>
                Close shift (Z)
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-text-dim">Opened by</span>
              <input
                value={openedBy}
                onChange={(e) => setOpenedBy(e.target.value)}
                className="w-40 rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-text-dim">Opening float</span>
              <input
                type="number"
                min={0}
                value={floatAmt}
                onChange={(e) => setFloatAmt(e.target.value)}
                className="w-36 rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              />
            </label>
            <Button disabled={pending} onClick={() => act("open")}>
              Open shift
            </Button>
          </div>
        )}
      </section>

      {(x || z) && (
        <section className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-medium text-text-strong">
            {z ? "Z-report (closed)" : "X-report (mid-shift)"}
          </h2>
          <ReportBlock
            shift={z ?? x!.shift}
            expectedCash={z?.expectedCash ?? x!.expectedCash}
          />
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-medium text-text-strong">
            Shift history
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {history.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-5 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">{s.id}</p>
                  <p className="text-xs text-text-dim">
                    {formatDateTime(s.openedAt)}
                    {s.closedAt ? ` → ${formatDateTime(s.closedAt)}` : ""}
                  </p>
                </div>
                <div className="text-right text-xs text-text-dim">
                  <p>var {formatMoney(s.variance ?? 0)}</p>
                  <p>cash {formatMoney(s.cashSalesTotal)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
      <p className="mt-0.5 text-text-strong">{value}</p>
    </div>
  );
}

function ReportBlock({
  shift,
  expectedCash,
}: {
  shift: Shift;
  expectedCash: number | null;
}) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
      <Stat label="Opening float" value={formatMoney(shift.openingFloat)} />
      <Stat label="Cash sales" value={formatMoney(shift.cashSalesTotal)} />
      <Stat label="Card sales" value={formatMoney(shift.cardSalesTotal)} />
      <Stat label="Voids" value={formatMoney(shift.voidTotal)} />
      <Stat label="Expected cash" value={formatMoney(expectedCash ?? 0)} />
      {shift.closingDeclared != null && (
        <>
          <Stat
            label="Declared"
            value={formatMoney(shift.closingDeclared)}
          />
          <Stat label="Variance" value={formatMoney(shift.variance ?? 0)} />
        </>
      )}
    </dl>
  );
}
