"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Product, Sale } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { saleToTicketText } from "@/lib/receipt";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import {
  JOB_CONFIG,
  JOB_STATUSES,
  type JobType,
} from "@/lib/jobs-config";

interface Part {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}
interface Labour {
  id: string;
  description: string;
  amount: number;
}
interface Job {
  id: string;
  type: JobType;
  customer: string;
  phone: string;
  subject: string;
  issue: string;
  status: string;
  parts: Part[];
  labour: Labour[];
}

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [labourDesc, setLabourDesc] = useState("");
  const [labourAmt, setLabourAmt] = useState("");
  const [done, setDone] = useState<Sale | null>(null);

  const load = useCallback(() => {
    fetch(`/api/jobs/${id}`)
      .then((r) => r.json())
      .then((j) => j.success && setJob(j.data));
  }, [id]);
  useEffect(() => load(), [load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const j = await (
      await fetch(`/api/jobs/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
    ).json();
    if (j.success && action !== "settle") setJob(j.data);
    return j;
  }

  const parts = job?.parts ?? [];
  const labour = job?.labour ?? [];
  const total =
    parts.reduce((s, p) => s + p.unitPrice * p.quantity, 0) +
    labour.reduce((s, l) => s + l.amount, 0);

  async function settle() {
    const j = await act("settle", { paymentMethod: "cash", cashReceived: total });
    if (j.success) setDone(j.data as Sale);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-3xl text-accent">
          ✓
        </div>
        <h1 className="mt-4 text-lg font-semibold text-text-strong">
          {done.id} collected
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
            onClick={() => router.push(JOB_CONFIG[job?.type ?? "repair"].basePath)}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!job) {
    return <p className="p-10 text-center text-sm text-text-dim">Loading…</p>;
  }
  const cfg = JOB_CONFIG[job.type];

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <ModuleHeader
        title={`${cfg.title} · ${job.customer || job.id}`}
        subtitle={job.subject || cfg.subjectLabel}
      />

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer" value={job.customer} onCommit={(v) => act("meta", { meta: { customer: v } })} />
              <Field label="Phone" value={job.phone} onCommit={(v) => act("meta", { meta: { phone: v } })} />
            </div>
            <Field label={cfg.subjectLabel} value={job.subject} onCommit={(v) => act("meta", { meta: { subject: v } })} />
            <Field label="Reported issue" value={job.issue} onCommit={(v) => act("meta", { meta: { issue: v } })} />
            <div className="mt-3">
              <span className="mb-1 block text-sm text-text-dim">Status</span>
              <div className="flex flex-wrap gap-1">
                {JOB_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => act("meta", { meta: { status: s } })}
                    className={`rounded-full px-2.5 py-1 text-xs capitalize transition ${
                      job.status === s
                        ? "bg-accent text-accent-ink"
                        : "border border-line text-text-dim hover:text-text-body"
                    }`}
                  >
                    {s.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ProductPicker onPick={(p) => act("addPart", { productId: p.id })} />

          {/* Labour */}
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <p className="mb-2 text-sm font-medium text-text-strong">Labour / charges</p>
            <div className="flex gap-2">
              <input
                value={labourDesc}
                onChange={(e) => setLabourDesc(e.target.value)}
                placeholder="Description"
                className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
              />
              <input
                type="number"
                value={labourAmt}
                onChange={(e) => setLabourAmt(e.target.value)}
                placeholder="Amount"
                className="w-28 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
              />
              <button
                onClick={async () => {
                  if (!labourDesc.trim()) return;
                  await act("addLabour", {
                    description: labourDesc.trim(),
                    amount: Number(labourAmt) || 0,
                  });
                  setLabourDesc("");
                  setLabourAmt("");
                }}
                className="rounded-lg border border-line px-3 text-sm text-text-body transition hover:border-accent hover:text-accent"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Job sheet */}
        <section className="flex h-fit flex-col rounded-xl border border-line bg-surface-1">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-semibold text-text-strong">Job sheet</h2>
          </div>
          <div className="max-h-96 overflow-y-auto px-4 py-3">
            {parts.length === 0 && labour.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                Add parts and labour.
              </p>
            ) : (
              <>
                {parts.map((p) => (
                  <div key={p.productId} className="mb-2 rounded-lg border border-line bg-surface-2 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-strong">{p.name}</p>
                      <p className="text-sm font-semibold text-accent">
                        {formatMoney(p.unitPrice * p.quantity)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      <StepBtn label="−" onClick={() => act("setPartQty", { productId: p.productId, quantity: p.quantity - 1 })} />
                      <span className="w-8 text-center text-sm font-semibold text-text-strong">{p.quantity}</span>
                      <StepBtn label="+" onClick={() => act("setPartQty", { productId: p.productId, quantity: p.quantity + 1 })} />
                    </div>
                  </div>
                ))}
                {labour.map((l) => (
                  <div key={l.id} className="mb-2 flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">
                    <span className="text-text-body">🛠 {l.description}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-text-strong">{formatMoney(l.amount)}</span>
                      <button
                        onClick={() => act("removeLabour", { labourId: l.id })}
                        className="text-text-dim transition hover:text-danger"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="space-y-2 border-t border-line px-5 py-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-text-strong">Total</p>
              <p className="text-xl font-bold text-accent">{formatMoney(total)}</p>
            </div>
            <button
              onClick={settle}
              disabled={total <= 0}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
            >
              Collect &amp; pay
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label className="mt-3 block text-sm first:mt-0">
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

function StepBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-7 w-7 rounded-md border border-line bg-surface-1 text-text-body transition hover:border-accent hover:text-accent"
    >
      {label}
    </button>
  );
}

function ProductPicker({ onPick }: { onPick: (p: Product) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Product[]>([]);
  const debounced = useDebounce(q, 200);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ pageSize: "12" });
    if (debounced.trim()) params.set("search", debounced.trim());
    fetch(`/api/products?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => j.success && setItems(j.data.items))
      .catch(() => undefined);
    return () => controller.abort();
  }, [debounced]);

  return (
    <div className="rounded-xl border border-line bg-surface-1 p-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search parts to add…"
        className="w-full rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="flex flex-col justify-between rounded-lg border border-line bg-surface-2 p-2.5 text-left transition hover:border-accent/60"
          >
            <p className="line-clamp-2 text-xs font-medium text-text-strong">{p.name}</p>
            <p className="mt-1 text-sm font-semibold text-accent">{formatMoney(p.salePrice)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
