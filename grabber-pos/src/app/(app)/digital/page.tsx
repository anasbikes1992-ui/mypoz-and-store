"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CollectionManager } from "@/components/collections/CollectionManager";

type DeliveryChannel = "email" | "whatsapp";

interface DigitalGood {
  id: string;
  name?: string;
  sku?: string;
  price?: number;
  deliveryChannel?: DeliveryChannel;
  bodyTemplate?: string;
}

interface CartItem {
  good: DigitalGood;
  qty: number;
}

interface SettledSale {
  receiptNo?: string;
  total?: number;
  items: CartItem[];
  customerMobile: string;
  customerEmail: string;
}

function fillTemplate(
  tpl: string,
  ctx: { name: string; sku: string; receiptNo: string },
) {
  return tpl
    .replace(/\{\{name\}\}/gi, ctx.name)
    .replace(/\{\{sku\}\}/gi, ctx.sku)
    .replace(/\{\{receipt\}\}/gi, ctx.receiptNo);
}

export default function DigitalModePage() {
  const [goods, setGoods] = useState<DigitalGood[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [settled, setSettled] = useState<SettledSale | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  function loadGoods() {
    fetch("/api/collections/digital_goods")
      .then((r) => r.json())
      .then((j) => j.success && setGoods(j.data ?? []))
      .catch(() => undefined);
  }

  useEffect(() => {
    loadGoods();
    fetch("/api/email/send")
      .then((r) => r.json())
      .then((j) => j.success && setEmailConfigured(Boolean(j.data?.configured)))
      .catch(() => undefined);
  }, []);

  const total = useMemo(
    () => cart.reduce((s, c) => s + (Number(c.good.price) || 0) * c.qty, 0),
    [cart],
  );

  function addToCart(good: DigitalGood) {
    setSettled(null);
    setCart((prev) => {
      const i = prev.findIndex((c) => c.good.id === good.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { good, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((c) => c.good.id !== id)
        : prev.map((c) => (c.good.id === id ? { ...c, qty } : c)),
    );
  }

  async function settle() {
    if (cart.length === 0) return;
    setPending(true);
    setMsg(null);
    try {
      const lines = cart.map((c) => ({
        productId: `CUSTOM-DIGITAL-${c.good.id}`,
        quantity: c.qty,
        discount: 0,
        name: String(c.good.name ?? "Digital good"),
        unitPrice: Number(c.good.price) || 0,
        custom: true,
      }));
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines,
          paymentMethod: "cash",
          serviceCharge: 0,
          finalDiscount: 0,
          isWholesale: false,
          customerMobile: mobile.trim() || undefined,
          customerName: email.trim() || mobile.trim() || undefined,
          channel: "digital",
          source: "OTHER",
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Sale failed" });
        return;
      }
      setSettled({
        receiptNo: j.data?.receiptNo ?? j.data?.id,
        total: j.data?.total ?? total,
        items: cart,
        customerMobile: mobile.trim(),
        customerEmail: email.trim(),
      });
      setCart([]);
      setMsg({ ok: true, text: `Sold · ${j.data?.receiptNo ?? "OK"}` });
    } finally {
      setPending(false);
    }
  }

  function deliveryBodies(sale: SettledSale): string[] {
    const receipt = String(sale.receiptNo ?? "");
    return sale.items.map((c) => {
      const name = String(c.good.name ?? "Digital good");
      const sku = String(c.good.sku ?? "");
      const tpl =
        String(c.good.bodyTemplate ?? "").trim() ||
        `Your digital purchase: ${name}${sku ? ` (${sku})` : ""}. Receipt ${receipt}.`;
      return fillTemplate(tpl, { name, sku, receiptNo: receipt });
    });
  }

  function openWhatsApp() {
    if (!settled) return;
    const phone = settled.customerMobile.replace(/\D/g, "");
    const text = deliveryBodies(settled).join("\n\n");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendEmailDelivery() {
    if (!settled?.customerEmail) {
      setMsg({ ok: false, text: "Enter a customer email first" });
      return;
    }
    setSendingEmail(true);
    setMsg(null);
    try {
      const bodies = deliveryBodies(settled);
      const items = settled.items.map((c) => ({
        name: String(c.good.name ?? "Digital good"),
        qty: c.qty,
        price: formatMoney(Number(c.good.price) || 0),
      }));
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: "digital-delivery",
          to: settled.customerEmail,
          data: {
            receiptNo: settled.receiptNo ?? "",
            customerName: settled.customerEmail,
            bodies,
            items,
            total: formatMoney(Number(settled.total) || 0),
          },
        }),
      });
      const j = await res.json();
      if (!j.success) {
        setMsg({ ok: false, text: j.error ?? "Email failed" });
        return;
      }
      setMsg({
        ok: true,
        text:
          j.data?.configured === false
            ? "Email queued (not configured — noop)"
            : "Delivery email sent",
      });
    } finally {
      setSendingEmail(false);
    }
  }

  if (manageOpen) {
    return (
      <div>
        <div className="mx-auto max-w-5xl px-6 pt-6">
          <button
            type="button"
            onClick={() => {
              setManageOpen(false);
              loadGoods();
            }}
            className="text-sm text-accent hover:underline"
          >
            ← Back to Digital sell
          </button>
        </div>
        <CollectionManager name="digital_goods" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <ModuleHeader
        title="Digital"
        subtitle="Sell non-inventory digital goods · settle as custom lines"
        actions={
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
          >
            Manage catalog
          </button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-line bg-surface-1 p-5">
          <h2 className="mb-3 text-sm font-medium text-text-strong">Catalog</h2>
          {goods.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-text-dim">
              No digital goods yet.{" "}
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="text-accent hover:underline"
              >
                Add catalog items
              </button>
            </p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {goods.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 bg-surface-2/40 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-strong">
                      {g.name || "Untitled"}
                    </p>
                    <p className="text-xs text-text-dim">
                      {g.sku ? `${g.sku} · ` : ""}
                      {g.deliveryChannel || "whatsapp"} ·{" "}
                      {formatMoney(Number(g.price) || 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(g)}
                    className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm text-text-dim transition hover:border-accent hover:text-accent"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-surface-1 p-5">
          <h2 className="mb-3 text-sm font-medium text-text-strong">Cart</h2>
          {cart.length === 0 ? (
            <p className="text-sm text-text-dim">Add digital items to settle.</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((c) => (
                <li
                  key={c.good.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm"
                >
                  <span className="truncate text-text-strong">{c.good.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={c.qty}
                      onChange={(e) =>
                        setQty(c.good.id, Number(e.target.value) || 0)
                      }
                      className="w-14 rounded border border-line bg-surface-1 px-2 py-1 text-right text-text-strong outline-none focus:border-accent"
                    />
                    <span className="w-20 text-right text-accent">
                      {formatMoney((Number(c.good.price) || 0) * c.qty)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-text-dim">Mobile (WhatsApp)</span>
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-text-dim">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-text-dim">Total</span>
            <span className="text-lg font-semibold text-accent">
              {formatMoney(total)}
            </span>
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
            onClick={() => void settle()}
            disabled={pending || cart.length === 0}
            className="mt-4 w-full rounded-lg bg-accent py-3 font-semibold text-accent-ink transition hover:bg-accent-strong disabled:opacity-40"
          >
            {pending ? "Settling…" : `Settle · ${formatMoney(total)}`}
          </button>

          {settled && (
            <div className="mt-4 space-y-2 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-sm font-medium text-text-strong">
                Delivery · {settled.receiptNo}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent"
                >
                  Send via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => void sendEmailDelivery()}
                  disabled={sendingEmail || !emailConfigured}
                  title={emailConfigured ? undefined : "Email not configured"}
                  className="rounded-lg border border-line px-3 py-2 text-sm text-text-dim transition hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  {sendingEmail ? "Sending…" : "Send via Email"}
                </button>
              </div>
              {!emailConfigured && (
                <p className="text-xs text-text-dim">
                  Email send needs RESEND_API_KEY — WhatsApp link still works.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
