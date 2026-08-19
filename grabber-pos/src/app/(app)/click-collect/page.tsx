"use client";

import { useCallback, useEffect, useState } from "react";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface CCOrder {
  id: string;
  customer: string;
  phone: string;
  items: string;
  status: string;
  note: string;
  source?: string;
  receiptNo?: string | null;
  createdAt: string;
}

const STATUSES = ["new", "preparing", "ready", "done"] as const;

export default function ClickCollectPage() {
  const [rows, setRows] = useState<CCOrder[]>([]);
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    items: "",
    note: "",
  });
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/click-collect")
      .then((r) => r.json())
      .then((j) => j.success && setRows(j.data))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load]);

  async function create() {
    const res = await fetch("/api/click-collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: form.customer,
        phone: form.phone || undefined,
        items: form.items,
        note: form.note || undefined,
      }),
    });
    const j = await res.json();
    if (!j.success) {
      setMsg(j.error ?? "Failed");
      return;
    }
    setForm({ customer: "", phone: "", items: "", note: "" });
    setMsg(null);
    load();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/click-collect/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <ModuleHeader
        title="Click & collect"
        subtitle="Pick list for storefront / walk-in holds"
      />

      <div className="mt-6 rounded-xl border border-line bg-surface-1 p-5">
        <p className="mb-3 text-sm font-medium text-text-strong">New order</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Customer"
            value={form.customer}
            onChange={(v) => setForm((f) => ({ ...f, customer: v }))}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          />
          <label className="block text-xs text-text-dim sm:col-span-2">
            Items
            <textarea
              value={form.items}
              onChange={(e) =>
                setForm((f) => ({ ...f, items: e.target.value }))
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
            />
          </label>
          <Field
            label="Note"
            value={form.note}
            onChange={(v) => setForm((f) => ({ ...f, note: v }))}
          />
        </div>
        {msg && <p className="mt-2 text-sm text-danger">{msg}</p>}
        <button
          type="button"
          onClick={() => void create()}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
        >
          Create order
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
                  {r.source === "storefront" && (
                    <span className="ml-2 rounded-full bg-[color-mix(in_oklch,var(--tint-teal)_15%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase text-tint-teal">
                      web
                    </span>
                  )}
                </p>
                {r.receiptNo && (
                  <p className="text-xs font-mono text-accent">{r.receiptNo}</p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-sm text-text-body">
                  {r.items}
                </p>
                {r.note && (
                  <p className="mt-1 text-xs text-text-dim">{r.note}</p>
                )}
              </div>
              <select
                value={
                  r.status === "pending"
                    ? "new"
                    : r.status === "picked"
                      ? "preparing"
                      : r.status === "collected"
                        ? "done"
                        : r.status
                }
                onChange={(e) => void setStatus(r.id, e.target.value)}
                className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-text-strong"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-dim">
            No click &amp; collect orders.
          </p>
        )}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs text-text-dim">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
      />
    </label>
  );
}
