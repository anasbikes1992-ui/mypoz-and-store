"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Agreement {
  id: string;
  customer: string;
  item: string;
  total: number;
  downPayment: number;
  installments: number;
  paid: number;
  balance: number;
  installmentAmount: number;
  status: string;
  nextDueAt?: string | null;
  overdueDays?: number;
}

export default function HirePurchasePage() {
  const [rows, setRows] = useState<Agreement[]>([]);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    item: "",
    total: "",
    downPayment: "",
    installments: "",
  });
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/hire-purchase")
      .then((r) => r.json())
      .then((j) => j.success && setRows(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function create() {
    const res = await fetch("/api/hire-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: form.customer,
        phone: form.phone || undefined,
        item: form.item,
        total: Number(form.total),
        downPayment: Number(form.downPayment) || 0,
        installments: Number(form.installments) || 1,
      }),
    });
    const j = await res.json();
    if (!j.success) {
      setMsg({ ok: false, text: j.error ?? "Failed" });
      return;
    }
    setMsg({ ok: true, text: `${j.data.id} created.` });
    setForm({ customer: "", phone: "", item: "", total: "", downPayment: "", installments: "" });
    load();
  }

  async function pay(id: string) {
    const amount = Number(payAmounts[id]);
    if (!(amount > 0)) return;
    const res = await fetch(`/api/hire-purchase/${id}`, {
      method: "POST",
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
      <ModuleHeader title="Hire purchase" subtitle="Installment agreements" />

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <p className="mb-3 text-sm font-medium text-text-strong">New agreement</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <In label="Customer" v={form.customer} on={(v) => set("customer", v)} />
          <In label="Phone" v={form.phone} on={(v) => set("phone", v)} />
          <In label="Item" v={form.item} on={(v) => set("item", v)} />
          <In label="Total price" v={form.total} on={(v) => set("total", v)} num />
          <In label="Down payment" v={form.downPayment} on={(v) => set("downPayment", v)} num />
          <In label="Installments" v={form.installments} on={(v) => set("installments", v)} num />
        </div>
        {msg && (
          <p
            className={`mt-3 rounded-lg border px-4 py-2 text-sm ${
              msg.ok ? "border-accent/40 bg-accent/10 text-accent" : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {msg.text}
          </p>
        )}
        <button
          onClick={create}
          disabled={!form.customer || !form.item || !Number(form.total)}
          className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
        >
          Create agreement
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-8 space-y-3">
          {rows.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="rounded-xl border border-line bg-surface-1 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-strong">
                    {a.customer} · {a.item}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase ${
                        a.status === "completed" ? "bg-accent/15 text-accent" : "bg-warn/15 text-warn"
                      }`}
                    >
                      {a.status}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-text-dim">
                    {a.installments} installments · ~{formatMoney(a.installmentAmount)} each
                    {a.nextDueAt && a.status !== "completed" && (
                      <>
                        {" "}
                        · Due{" "}
                        {new Date(a.nextDueAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </>
                    )}
                  </p>
                  {(a.overdueDays ?? 0) > 0 && (
                    <p className="mt-1 text-xs font-medium text-danger">
                      {a.overdueDays} day(s) overdue
                    </p>
                  )}
                </div>
                <div className="text-right text-sm">
                  <p className="text-text-dim">
                    Paid <span className="text-text-body">{formatMoney(a.paid)}</span> / {formatMoney(a.total)}
                  </p>
                  <p className={`font-semibold ${a.balance > 0 ? "text-warn" : "text-accent"}`}>
                    Balance {formatMoney(a.balance)}
                  </p>
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${a.total ? Math.min(100, (a.paid / a.total) * 100) : 0}%` }}
                />
              </div>

              {a.status !== "completed" && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    value={payAmounts[a.id] ?? ""}
                    onChange={(e) => setPayAmounts((p) => ({ ...p, [a.id]: e.target.value }))}
                    placeholder={`Installment (${formatMoney(a.installmentAmount)})`}
                    className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => pay(a.id)}
                    className="rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
                  >
                    Record payment
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
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
    <label className="text-sm">
      <span className="mb-1 block text-text-dim">{label}</span>
      <input
        type={num ? "number" : "text"}
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}
