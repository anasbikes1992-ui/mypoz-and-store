"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { formatMoney } from "@/lib/format";
import { whatsAppLink, whatsAppOrderText } from "@/lib/storefront";
import {
  PAYMENT_LABELS,
  FULFILMENT_LABELS,
  type WebsiteConfig,
  type PaymentMode,
  type FulfilmentMode,
} from "@/lib/website";

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantId?: string | null;
}

function lineKey(line: { productId: string; variantId?: string | null }): string {
  return line.variantId ? `${line.productId}:${line.variantId}` : line.productId;
}

interface CartState {
  lines: CartLine[];
  count: number;
  total: number;
  add: (line: Omit<CartLine, "quantity">) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clear: () => void;
  open: () => void;
}

const CartCtx = createContext<CartState | null>(null);

export function useCart(): CartState {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

interface ProviderProps {
  slug: string;
  businessName: string;
  whatsappNumber: string | null;
  currency: string;
  website: WebsiteConfig;
  children: React.ReactNode;
}

function track(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  };
  w.gtag?.("event", event, payload);
  w.fbq?.(
    "track",
    event === "add_to_cart"
      ? "AddToCart"
      : event === "purchase"
        ? "Purchase"
        : "ViewContent",
    payload,
  );
}

const STORAGE_KEY = "grabber-store-cart";

export function CartProvider({
  slug,
  businessName,
  whatsappNumber,
  currency,
  website,
  children,
}: ProviderProps) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:${slug}`);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, [slug]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`${STORAGE_KEY}:${slug}`, JSON.stringify(lines));
    } catch {
      // ignore
    }
  }, [lines, slug, hydrated]);

  const add = useCallback(
    (line: Omit<CartLine, "quantity">) => {
      setLines((prev) => {
        const key = lineKey(line);
        const existing = prev.find((l) => lineKey(l) === key);
        return existing
          ? prev.map((l) =>
              lineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l,
            )
          : [...prev, { ...line, quantity: 1 }];
      });
      setShowCart(true);
      track("add_to_cart", {
        currency,
        value: line.price,
        items: [{ item_name: line.name }],
      });
    },
    [currency],
  );

  const setQuantity = useCallback(
    (productId: string, quantity: number, variantId?: string | null) => {
      const key = lineKey({ productId, variantId });
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => lineKey(l) !== key)
          : prev.map((l) => (lineKey(l) === key ? { ...l, quantity } : l)),
      );
    },
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const total = useMemo(
    () => lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [lines],
  );
  const count = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines],
  );

  const value: CartState = {
    lines,
    count,
    total,
    add,
    setQuantity,
    clear,
    open: () => setShowCart(true),
  };

  return (
    <CartCtx.Provider value={value}>
      {children}
      {showCart && (
        <CartDrawer
          slug={slug}
          businessName={businessName}
          whatsappNumber={whatsappNumber}
          currency={currency}
          website={website}
          onClose={() => setShowCart(false)}
        />
      )}
    </CartCtx.Provider>
  );
}

export function CartButton() {
  const { count, open } = useCart();
  return (
    <button
      type="button"
      onClick={open}
      className="relative inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--accent)_40%,transparent)] transition hover:bg-accent-strong active:scale-[0.98]"
    >
      Cart
      {count > 0 && (
        <span className="rounded-full bg-accent-ink/15 px-2 py-0.5 text-xs font-bold text-accent-ink">
          {count}
        </span>
      )}
    </button>
  );
}

export function AddToCartButton({
  productId,
  name,
  price,
  inStock,
  variantId,
}: {
  productId: string;
  name: string;
  price: number;
  inStock: boolean;
  variantId?: string | null;
}) {
  const { add } = useCart();
  if (!inStock) {
    return (
      <span className="rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-semibold text-text-dim">
        Out of stock
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => add({ productId, name, price, variantId })}
      className="rounded-lg bg-tint-green px-3 py-1.5 text-xs font-bold text-accent-ink shadow-sm transition hover:brightness-110 active:scale-[0.97]"
    >
      Add
    </button>
  );
}

function CartDrawer({
  slug,
  businessName,
  whatsappNumber,
  currency,
  website,
  onClose,
}: {
  slug: string;
  businessName: string;
  whatsappNumber: string | null;
  currency: string;
  website: WebsiteConfig;
  onClose: () => void;
}) {
  const { lines, total, setQuantity, clear } = useCart();
  const [step, setStep] = useState<"cart" | "details" | "done">("cart");
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
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [boardKind, setBoardKind] = useState<string | null>(null);

  const waHref = whatsAppLink(
    whatsappNumber,
    whatsAppOrderText(businessName, lines, total, currency),
  );

  const isPickup = fulfilment === "pickup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          paymentProofUrl:
            paymentMethod === "bank_transfer" && paymentProofUrl
              ? paymentProofUrl
              : undefined,
          fulfilment,
          clientUuid: crypto.randomUUID(),
          lines: lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            variantId: l.variantId || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Order could not be placed");

      // Card / online — PENDING sale already created; start gateway checkout.
      // Webhook is the only path that completes the sale and decrements stock.
      if (paymentMethod === "card") {
        const amountMinor = Math.round(Number(total) * 100);
        const payRes = await fetch(`/api/store/${slug}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: json.data.receiptNo,
            saleId: json.data.id,
            amountMinor,
            currency: currency === "USD" ? "USD" : "LKR",
            description: `${businessName} order ${json.data.receiptNo}`,
            customer: {
              name,
              email: email || undefined,
              phone: mobile,
            },
          }),
        });
        const payJson = await payRes.json();
        if (!payJson.success) throw new Error(payJson.error || "Could not start online payment");

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
        throw new Error("Unexpected checkout response");
      }

      track("purchase", {
        currency,
        value: total,
        transaction_id: json.data.receiptNo,
      });
      setReceipt(json.data.receiptNo);
      setBoardKind(json.data.boardKind);
      clear();
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order could not be placed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-line bg-surface-1 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h1 className="font-semibold text-text-strong">
            {step === "done" ? "Order placed" : "Your order"}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="rounded-lg px-2 py-1 text-text-dim transition hover:text-text-strong"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === "done" ? (
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--tint-green)_15%,transparent)] text-2xl font-bold text-tint-green">
                ✓
              </div>
              <p className="font-semibold text-text-strong">
                Thank you, {name || "friend"}!
              </p>
              <p className="text-sm text-text-dim">
                Order{" "}
                <span className="font-mono font-semibold text-accent">{receipt}</span>{" "}
                is confirmed. We&apos;ll contact {mobile}. Payment:{" "}
                {PAYMENT_LABELS[paymentMethod]}. Fulfilment:{" "}
                {FULFILMENT_LABELS[fulfilment]}
                {boardKind === "click-collect"
                  ? " — your pick list is with the store."
                  : boardKind === "delivery"
                    ? " — the delivery board has your order."
                    : "."}
              </p>
            </div>
          ) : lines.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-dim">
              Your cart is empty.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li
                  key={l.variantId ? `${l.productId}:${l.variantId}` : l.productId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-strong">
                      {l.name}
                    </p>
                    <p className="text-xs font-semibold text-tint-green">
                      {formatMoney(l.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(l.productId, l.quantity - 1, l.variantId)}
                      aria-label={`Reduce ${l.name}`}
                      className="h-7 w-7 rounded-lg border border-line bg-surface-1 text-text-body transition hover:border-accent"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums text-text-strong">
                      {l.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(l.productId, l.quantity + 1, l.variantId)}
                      aria-label={`Add another ${l.name}`}
                      className="h-7 w-7 rounded-lg border border-line bg-surface-1 text-text-body transition hover:border-accent"
                    >
                      +
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {step === "details" && (
            <form id="checkout" onSubmit={submit} className="mt-5 space-y-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <input
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile number"
                inputMode="tel"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional — for order history)"
                className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-text-dim">
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
                          : "border border-line text-text-dim"
                      }`}
                    >
                      {FULFILMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {isPickup ? (
                <>
                  <textarea
                    value={pickupNote}
                    onChange={(e) => setPickupNote(e.target.value)}
                    placeholder="Pickup note (optional)"
                    rows={2}
                    className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                  {website.pickupInstructions ? (
                    <p className="text-xs text-text-dim">
                      {website.pickupInstructions}
                    </p>
                  ) : null}
                </>
              ) : (
                <textarea
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={
                    fulfilment === "pickme" || fulfilment === "uber"
                      ? "Delivery address (staff will book the ride)"
                      : "Delivery address"
                  }
                  rows={3}
                  className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              )}

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-text-dim">
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
                          : "border border-line text-text-dim"
                      }`}
                    >
                      {PAYMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </fieldset>

              {paymentMethod === "bank_transfer" && (
                <>
                  {website.bankTransferInstructions ? (
                    <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface-2/80 p-3 text-xs text-text-dim">
                      {website.bankTransferInstructions}
                    </p>
                  ) : null}
                  <input
                    required
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transfer reference"
                    className="w-full rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-text-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
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
                </>
              )}

              {paymentMethod === "cash" && (
                <p className="text-xs text-text-dim">
                  Staff will confirm cash at handover.
                </p>
              )}
              {paymentMethod === "card" && (
                <p className="text-xs text-text-dim">
                  You will be redirected to Grabber&apos;s secure payment gateways
                  (WebXPay / PayHere / OnePay / LankaPay / Stripe) after placing the order.
                </p>
              )}

              {error && <p className="text-sm text-danger">{error}</p>}
            </form>
          )}
        </div>

        {step !== "done" && lines.length > 0 && (
          <div className="space-y-3 border-t border-line px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-dim">Total</span>
              <span className="text-lg font-bold text-tint-green">
                {formatMoney(total)}
              </span>
            </div>

            {step === "cart" ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink transition hover:bg-accent-strong"
                >
                  Checkout
                </button>
                {waHref && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded-xl border border-[color-mix(in_oklch,var(--tint-teal)_40%,var(--line))] bg-[color-mix(in_oklch,var(--tint-teal)_10%,transparent)] py-3 text-center text-sm font-semibold text-tint-teal transition hover:bg-[color-mix(in_oklch,var(--tint-teal)_18%,transparent)]"
                  >
                    Order on WhatsApp instead
                  </a>
                )}
              </div>
            ) : (
              <button
                form="checkout"
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-tint-green py-3 text-sm font-bold text-accent-ink transition hover:brightness-110 disabled:opacity-50"
              >
                {busy ? "Placing order…" : "Place order"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
