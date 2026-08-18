"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface LayawayRow {
  id: string;
  customer: string;
  phone: string;
  total: number;
  deposit: number;
  balance: number;
  status: string;
  linesSummary: string;
  createdAt: string;
}

export default function LayawayPage() {
  const [rows, setRows] = useState<LayawayRow[]>([]);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    total: "",
    deposit: "",
    linesSummary: "",
  });
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/layaway")
      .then((r) => r.json())
      .then((j) => j.success && setRows(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function create() {
    const res = await fetch("/api/layaway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: form.customer,
        phone: form.phone || undefined,
        total: Number(form.total),
        deposit: Number(form.deposit) || 0,
        linesSummary: form.linesSummary || undefined,
      }),
    });
    const j = await res.json();
    if (!j.success) {
      setMsg({ ok: false, text: j.error ?? "Failed" });
      return;
    }
    setMsg({ ok: true, text: `${j.data.id} created.` });
    setForm({
      customer: "",
      phone: "",
      total: "",
      deposit: "",
      linesSummary: "",
    });
    load();
  }

  async function addDeposit(id: string) {
    const amount = Number(payAmounts[id]);
    if (!(amount > 0)) return;
    const res = await fetch(`/api/layaway/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if ((await res.json()).success) {
      setPayAmounts((p) => ({ ...p, [id]: "" }));
      load();
    }
  }

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Layaway / deposits"
        subtitle="Hold items with partial deposits"
      />

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <p className="mb-3 text-sm font-medium text-text-strong">New layaway</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <In label="Customer" v={form.customer} on={(v) => set("customer", v)} />
          <In label="Phone" v={form.phone} on={(v) => set("phone", v)} />
          <In
            label="Items summary"
            v={form.linesSummary}
            on={(v) => set("linesSummary", v)}
          />
          <In label="Total" v={form.total} on={(v) => set("total", v)} num />
          <In
            label="Initial deposit"
            v={form.deposit}
            on={(v) => set("deposit", v)}
            num
          />
        </div>
        {msg && (
          <p
            className={`mt-3 rounded-lg border px-4 py-2 text-sm ${
              msg.ok
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => void create()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          Create layaway
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="rounded-xl border border-line bg-surface-1 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text-strong">
                  {r.customer}{" "}
                  <span className="text-xs text-text-dim">{r.id}</span>
                </p>
                <p className="text-sm text-text-dim">{r.linesSummary}</p>
                <p className="mt-1 text-sm text-text-body">
                  Paid {formatMoney(r.deposit)} · Balance{" "}
                  <span className="text-accent">{formatMoney(r.balance)}</span>{" "}
                  of {formatMoney(r.total)} · {r.status}
                </p>
              </div>
              {r.status === "active" && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={payAmounts[r.id] ?? ""}
                    onChange={(e) =>
                      setPayAmounts((p) => ({ ...p, [r.id]: e.target.value }))
                    }
                    placeholder="Deposit"
                    className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-text-strong outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => void addDeposit(r.id)}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm text-accent"
                  >
                    Add deposit
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
            No layaways yet.
          </p>
        )}
      </ul>
    </div>
  );
}

function In({
  label,
  v,
  on,
  num,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  num?: boolean;
}) {
  return (
    <label className="block text-xs text-text-dim">
      {label}
      <input
        type={num ? "number" : "text"}
        value={v}
        onChange={(e) => on(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}
