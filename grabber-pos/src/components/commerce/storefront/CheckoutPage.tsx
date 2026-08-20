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

const MAX_LOCATION_LEN = 300;
const MAX_ADDRESS_LEN = 500;

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
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
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
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const safeLocation = locationUrl.trim();
  const composedAddress = [
    addressLine1.trim(),
    addressLine2.trim(),
    landmark.trim() ? `Landmark: ${landmark.trim()}` : "",
    [city.trim(), postalCode.trim()].filter(Boolean).join(" "),
    safeLocation ? `Location: ${safeLocation}` : "",
  ]
    .filter(Boolean)
    .join(", ");

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
  const orderTotal = Math.max(0, subtotal + deliveryFee + codFee - discount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!lines.length) return;
    if (!isPickup) {
      if (safeLocation.length > MAX_LOCATION_LEN) {
        setError(`Location link is too long. Keep it under ${MAX_LOCATION_LEN} characters.`);
        return;
      }
      if (composedAddress.length > MAX_ADDRESS_LEN) {
        setError(
          `Address details are too long (${composedAddress.length}/${MAX_ADDRESS_LEN}). Please shorten line 2 or landmark.`,
        );
        return;
      }
    }
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
          address: isPickup ? pickupNote || "Store pickup" : composedAddress,
          pickupNote: isPickup ? pickupNote : undefined,
          paymentMethod,
          paymentReference:
            paymentMethod === "bank_transfer" ? paymentReference : undefined,
          paymentProofUrl:
            paymentMethod === "bank_transfer" && paymentProofUrl
              ? paymentProofUrl
              : undefined,
          fulfilment,
          deliveryZoneId: isPickup ? undefined : deliveryZoneId || undefined,
          clientUuid: crypto.randomUUID(),
          discountCode: discount > 0 ? discountCode : undefined,
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
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--tint-green)_15%,transparent)] text-2xl text-tint-green">
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

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase text-text-dim">Full name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase text-text-dim">Mobile</span>
          <input
          required
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="Mobile number"
          inputMode="tel"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase text-text-dim">Email (optional)</span>
          <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
          className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
        </label>

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
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase text-text-dim">Address line 1</span>
              <input
                required
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="No., street, area"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase text-text-dim">Address line 2 (optional)</span>
              <input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Apartment, floor, unit, etc."
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase text-text-dim">City</span>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase text-text-dim">Postal code</span>
                <input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Postal code"
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
                />
              </label>
            </div>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase text-text-dim">Landmark (optional)</span>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Nearby landmark for easier delivery"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
              />
            </label>
            <div className="rounded-xl border border-line bg-surface-2/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-text-dim">Location picker (optional)</p>
                <button
                  type="button"
                  disabled={locating}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-text-body disabled:opacity-60"
                  onClick={() => {
                    setError(null);
                    if (!navigator.geolocation) {
                      setError("Location is not supported on this device.");
                      return;
                    }
                    setLocating(true);
                    navigator.geolocation.getCurrentPosition(
                      ({ coords }) => {
                        const url = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
                        setLocationUrl(url);
                        setLocating(false);
                      },
                      () => {
                        setError("Could not fetch location. You can still type your address manually.");
                        setLocating(false);
                      },
                      { enableHighAccuracy: true, timeout: 10000 },
                    );
                  }}
                >
                  {locating ? "Getting location..." : "Use my current location"}
                </button>
              </div>
              <input
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                placeholder="Paste Google Maps pin URL (optional)"
                className="mt-2 w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-[11px] text-text-dim">
                {safeLocation.length}/{MAX_LOCATION_LEN} characters
              </p>
            </div>
            <p className="text-[11px] text-text-dim">
              Combined delivery address: {composedAddress.length}/{MAX_ADDRESS_LEN}
            </p>
          </div>
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
          <div className="space-y-2">
            <input
              required
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Transfer reference"
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
            />
            <label className="block text-xs font-semibold text-text-dim">
              Bank slip (image, optional)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1 block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setPaymentProofUrl("");
                    setPaymentProofName("");
                    return;
                  }
                  if (!file.type.startsWith("image/")) {
                    setError("Please upload an image of your bank slip");
                    e.target.value = "";
                    return;
                  }
                  if (file.size > 1_100_000) {
                    setError("Bank slip image must be under ~1 MB");
                    e.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = String(reader.result || "");
                    if (result.length > 1_500_000) {
                      setError("Bank slip image is too large after encoding");
                      setPaymentProofUrl("");
                      setPaymentProofName("");
                      return;
                    }
                    setError(null);
                    setPaymentProofUrl(result);
                    setPaymentProofName(file.name);
                  };
                  reader.onerror = () => {
                    setError("Could not read bank slip image");
                    setPaymentProofUrl("");
                    setPaymentProofName("");
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            {paymentProofName ? (
              <p className="text-xs text-text-dim">Attached: {paymentProofName}</p>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={discountCode}
            onChange={(e) => {
              setDiscountCode(e.target.value);
              setDiscount(0);
            }}
            placeholder="Discount code"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm"
          />
          <button
            type="button"
            className="rounded-xl border border-line px-3 text-sm font-semibold"
            onClick={async () => {
              setError(null);
              try {
                const res = await fetch("/api/commerce/discounts/validate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: discountCode, subtotal }),
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.error || "Invalid code");
                setDiscount(Number(json.data.discount) || 0);
              } catch (e) {
                setDiscount(0);
                setError(e instanceof Error ? e.message : "Invalid code");
              }
            }}
          >
            Apply
          </button>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-tint-green py-3.5 text-sm font-bold text-accent-ink disabled:opacity-50"
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
            <p className="text-xs text-tint-green">Free delivery applied</p>
          )}
          {discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-dim">Discount</dt>
              <dd className="tabular-nums">-{formatMoney(discount)}</dd>
            </div>
          )}
          {codFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-text-dim">COD fee</dt>
              <dd className="tabular-nums">{formatMoney(codFee)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums text-tint-green">
              {formatMoney(orderTotal)}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
