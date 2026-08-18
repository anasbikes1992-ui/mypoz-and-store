"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Product, Sale } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { saleToTicketText } from "@/lib/receipt";
import { useDebounce } from "@/hooks/useDebounce";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

interface Line {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  sentQty: number;
}
interface Order {
  id: string;
  customer: string;
  phone: string;
  address: string;
  driver: string;
  status: string;
  lines: Line[];
}

const STATUSES = ["new", "preparing", "out", "delivered"] as const;

export default function DeliveryOrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; name?: string }[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [done, setDone] = useState<Sale | null>(null);

  const load = useCallback(() => {
    fetch(`/api/delivery/orders/${id}`)
      .then((r) => r.json())
      .then((j) => j.success && setOrder(j.data));
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/collections/drivers")
      .then((r) => r.json())
      .then((j) => j.success && setDrivers(j.data));
  }, [id, load]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const j = await (
      await fetch(`/api/delivery/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
    ).json();
    return j;
  }
  async function saveMeta(meta: Record<string, string>) {
    const j = await act("meta", { meta });
    if (j.success) setOrder(j.data);
  }
  async function addItem(p: Product) {
    const j = await act("addItem", { productId: p.id });
    if (j.success) setOrder(j.data);
  }
  async function setQty(productId: string, quantity: number) {
    const j = await act("setQty", { productId, quantity });
    if (j.success) setOrder(j.data);
  }
  async function send() {
    setStatus("Sending…");
    const j = await act("send", {});
    if (j.success) {
      setOrder(j.data.order);
      setStatus(
        `Sent ${j.data.sent.length} item(s) — ${j.data.printed ? "printed to KOT" : j.data.printMessage}`,
      );
    } else setStatus(j.error ?? "Nothing to send");
  }
  async function settle() {
    const j = await act("settle", { paymentMethod: "cash", cashReceived: total });
    if (j.success) setDone(j.data as Sale);
    else setStatus(j.error ?? "Settle failed");
  }

  const lines = order?.lines ?? [];
  const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const newItems = lines.reduce((s, l) => s + (l.quantity - l.sentQty), 0);

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-3xl text-accent">
          ✓
        </div>
        <h1 className="mt-4 text-lg font-semibold text-text-strong">
          {done.id} delivered &amp; settled
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
            onClick={() => router.push("/delivery")}
            className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return <p className="p-10 text-center text-sm text-text-dim">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <ModuleHeader
        title={`Delivery ${order.customer || order.id}`}
        subtitle={newItems > 0 ? `${newItems} item(s) not sent` : "Ready"}
      />

      <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Details + menu */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-1 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Customer"
                value={order.customer}
                onCommit={(v) => saveMeta({ customer: v })}
              />
              <Field
                label="Phone"
                value={order.phone}
                onCommit={(v) => saveMeta({ phone: v })}
              />
            </div>
            <Field
              label="Address"
              value={order.address}
              onCommit={(v) => saveMeta({ address: v })}
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-text-dim">Driver</span>
                <select
                  value={order.driver}
                  onChange={(e) => saveMeta({ driver: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
                >
                  <option value="">— unassigned —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={String(d.name ?? "")}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-sm">
                <span className="mb-1 block text-text-dim">Status</span>
                <div className="flex flex-wrap gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => saveMeta({ status: s })}
                      className={`rounded-full px-2.5 py-1 text-xs capitalize transition ${
                        order.status === s
                          ? "bg-accent text-accent-ink"
                          : "border border-line text-text-dim hover:text-text-body"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ProductPicker onPick={addItem} />
        </div>

        {/* Order */}
        <section className="flex h-fit flex-col rounded-xl border border-line bg-surface-1">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-semibold text-text-strong">Order</h2>
          </div>
          <div className="max-h-80 overflow-y-auto px-4 py-3">
            {lines.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                Add items from the menu.
              </p>
            ) : (
              lines.map((l) => (
                <div
                  key={l.productId}
                  className="mb-2 rounded-lg border border-line bg-surface-2 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-text-strong">
                      {l.name}
                      {l.quantity > l.sentQty && (
                        <span className="ml-2 rounded-full bg-warn/15 px-1.5 py-0.5 text-[10px] text-warn">
                          +{l.quantity - l.sentQty}
                        </span>
                      )}
                    </p>
                    <p className="text-sm font-semibold text-accent">
                      {formatMoney(l.unitPrice * l.quantity)}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <StepBtn label="−" onClick={() => setQty(l.productId, l.quantity - 1)} />
                    <span className="w-8 text-center text-sm font-semibold text-text-strong">
                      {l.quantity}
                    </span>
                    <StepBtn label="+" onClick={() => setQty(l.productId, l.quantity + 1)} />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="space-y-2 border-t border-line px-5 py-4">
            {status && <p className="text-xs text-text-dim">{status}</p>}
            <div className="flex items-center justify-between">
              <p className="font-semibold text-text-strong">Total</p>
              <p className="text-xl font-bold text-accent">{formatMoney(total)}</p>
            </div>
            <button
              onClick={send}
              disabled={newItems === 0}
              className="w-full rounded-lg border border-line py-2 text-sm text-text-body transition hover:border-accent hover:text-accent disabled:opacity-40"
            >
              Send to Kitchen
            </button>
            <button
              onClick={settle}
              disabled={lines.length === 0}
              className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
            >
              Settle &amp; pay
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
    const params = new URLSearchParams({ pageSize: "18" });
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
        placeholder="Search menu items…"
        className="w-full rounded-lg border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none transition focus:border-accent"
      />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="flex flex-col justify-between rounded-lg border border-line bg-surface-2 p-2.5 text-left transition hover:border-accent/60"
          >
            <p className="line-clamp-2 text-xs font-medium text-text-strong">
              {p.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-accent">
              {formatMoney(p.salePrice)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
