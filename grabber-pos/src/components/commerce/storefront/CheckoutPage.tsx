"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/app/store/[slug]/cart";
import {
  PAYMENT_LABELS,
  FULFILMENT_LABELS,
  type WebsiteConfig,
  type PaymentMode,
  type FulfilmentMode,
} from "@/lib/website";
import type { StoreConfig } from "@/lib/commerce/schema";
import { storeCopy } from "@/lib/commerce/i18n";

export function CheckoutPage({
  slug,
  businessName,
  currency,
  locale,
  website,
  store,
}: {
  slug: string;
  businessName: string;
  currency: string;
  locale: "en" | "si" | "ta";
  website: WebsiteConfig;
  store: StoreConfig;
}) {
  const { lines, total, setQuantity, clear } = useCart();
  const copy = storeCopy(locale);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>(
    website.paymentModes[0] || "cash",
  );
  const [fulfilment, setFulfilment] = useState<FulfilmentMode>(
    website.fulfilmentModes[0] || "courier",
  );
  const [deliveryZoneId, setDeliveryZoneId] = useState<string>(
    store.delivery.zones[0]?.id ?? "",
  );
  const [paymentReference, setPaymentReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);

  const isPickup = fulfilment === "pickup";
  const subtotal = total;
  const zone = store.delivery.zones.find((z) => z.id === deliveryZoneId);
  const freeApplied =
    !isPickup &&
    store.delivery.freeThreshold > 0 &&
    subtotal >= store.delivery.freeThreshold;
  const deliveryFee = isPickup || freeApplied ? 0 : (zone?.fee ?? 0);
  const codFee =
    paymentMethod === "cash" && store.cod.enabled ? store.cod.fee : 0;
  const orderTotal = subtotal + deliveryFee + codFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/store/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerMobile: mobile,
          customerEmail: email || undefined,
          address: isPickup ? pickupNote || "Store pickup" : address,
          pickupNote: isPickup ? pickupNote : undefined,
          paymentMethod,
          paymentReference:
            paymentMethod === "bank_transfer" ? paymentReference : undefined,
          fulfilment,
          deliveryZoneId: isPickup ? undefined : deliveryZoneId || undefined,
          clientUuid: crypto.randomUUID(),
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            variantId: l.variantId || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Order failed");

      if (paymentMethod === "card") {
        const payRes = await fetch(`/api/store/${slug}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: json.data.receiptNo,
            saleId: json.data.id,
            amountMinor: Math.round(orderTotal * 100),
            currency: currency === "USD" ? "USD" : "LKR",
            description: `${businessName} order ${json.data.receiptNo}`,
            customer: { name, email: email || undefined, phone: mobile },
          }),
        });
        const payJson = await payRes.json();
        if (!payJson.success) throw new Error(payJson.error || "Payment failed");
        const checkout = payJson.data as {
          mode: "redirect" | "form";
          url?: string;
          formAction?: string;
          formFields?: Record<string, string>;
        };
        if (checkout.mode === "redirect" && checkout.url) {
          window.location.assign(checkout.url);
          return;
        }
        if (checkout.mode === "form" && checkout.formAction && checkout.formFields) {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = checkout.formAction;
          form.style.display = "none";
          for (const [k, v] of Object.entries(checkout.formFields)) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = k;
            input.value = v;
            form.appendChild(input);
          }
          document.body.appendChild(form);
          form.submit();
          return;
        }
      }

      setReceipt(json.data.receiptNo);
      clear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setBusy(false);
    }
  }

  if (!lines.length && !receipt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-text-dim">{copy.emptyCart}</p>
        <Link
          href={`/store/${slug}/products`}
          className="mt-4 inline-block text-sm font-semibold text-accent"
        >
          {copy.continueShopping}
        </Link>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--tint-green)_15%,transparent)] text-2xl text-[var(--tint-green)]">
          ✓
        </div>
        <h1 className="mt-4 text-xl font-bold">{copy.orderConfirmed}</h1>
        <p className="mt-2 text-sm text-text-dim">
          Order <span className="font-mono font-semibold">{receipt}</span>
        </p>
        <Link
          href={`/store/${slug}`}
          className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-ink"
        >
          {copy.continueShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-5">
      <form onSubmit={submit} className="space-y-4 lg:col-span-3">
        <h1 className="text-2xl font-bold">{copy.checkout}</h1>

        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
        />
        <input
          required
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Mobile number"
          inputMode="tel"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
        />

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase text-text-dim">
            Fulfilment
          </legend>
          <div className="flex flex-wrap gap-2">
            {website.fulfilmentModes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFulfilment(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  fulfilment === m
                    ? "bg-accent text-accent-ink"
                    : "border border-line"
                }`}
              >
                {FULFILMENT_LABELS[m]}
              </button>
            ))}
          </div>
        </fieldset>

        {!isPickup && store.delivery.zones.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase text-text-dim">
              Delivery zone
            </legend>
            <select
              value={deliveryZoneId}
              onChange={(e) => setDeliveryZoneId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
            >
              {store.delivery.zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {formatMoney(z.fee)}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {isPickup ? (
          <textarea
            value={pickupNote}
            onChange={(e) => setPickupNote(e.target.value)}
            placeholder="Pickup note (optional)"
            rows={2}
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        ) : (
          <textarea
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Delivery address"
            rows={3}
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase text-text-dim">
            Payment
          </legend>
          <div className="flex flex-wrap gap-2">
            {website.paymentModes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  paymentMethod === m
                    ? "bg-accent text-accent-ink"
                    : "border border-line"
                }`}
              >
                {PAYMENT_LABELS[m]}
              </button>
            ))}
          </div>
        </fieldset>

        {paymentMethod === "bank_transfer" && (
          <input
            required
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Transfer reference"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--tint-green)] py-3.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "Placing order…" : `Place order — ${formatMoney(orderTotal)}`}
        </button>
      </form>

      <aside className="rounded-3xl border border-line bg-surface-2/50 p-5 lg:col-span-2">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {l.name} × {l.quantity}
              </span>
              <span className="tabular-nums">{formatMoney(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-dim">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-dim">Delivery</dt>
              <dd className="tabular-nums">{formatMoney(deliveryFee)}</dd>
            </div>
          )}
          {freeApplied && (
            <p className="text-xs text-[var(--tint-green)]">Free delivery applied</p>
          )}
          {codFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-dim">COD fee</dt>
              <dd className="tabular-nums">{formatMoney(codFee)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums text-[var(--tint-green)]">
              {formatMoney(orderTotal)}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
