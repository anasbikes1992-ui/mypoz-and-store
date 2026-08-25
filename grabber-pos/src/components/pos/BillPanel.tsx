"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { springSoft } from "@/lib/motion";
import {
  useCartStore,
  cartTotals,
  effectivePrice,
  catalogPrice,
  isPriceOverridden,
  lineMoqWarnings,
} from "@/lib/store/cart-store";
import { formatMoney } from "@/lib/format";
import { saleToTicketText } from "@/lib/receipt";
import { CustomerPicker } from "@/components/pos/CustomerPicker";
import { enqueueFailedSale } from "@/lib/offline-queue";
import {
  PRICE_TIER_LABELS,
  WHOLESALE_QTY_PRESETS,
  resolveActiveTier,
} from "@/lib/pricing-tiers";
import type { PaymentMethod, Sale } from "@/lib/types";

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash (F1)" },
  { id: "card", label: "Card" },
  { id: "split", label: "Split" },
];

const MANAGER_DISCOUNT_PCT = 20;
const DISPLAY_KEY = "grabber-pos-display";

interface CurrencyRate {
  id: string;
  code: string;
  name?: string;
  rate: number;
}

async function verifyManagerPin(
  promptMsg: string,
  permission?: "price_override" | "discount_override" | "void_sale",
): Promise<boolean> {
  const pin = window.prompt(promptMsg);
  if (!pin) return false;
  const res = await fetch("/api/permissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pin,
      action: "verify",
      permission,
      role: "manager",
    }),
  });
  const json = await res.json();
  return !!(json.success && json.data?.valid);
}

function isVariantLine(productId: string): boolean {
  return productId.includes(":");
}

async function auditPriceOverride(
  productId: string,
  name: string,
  from: number,
  to: number,
) {
  try {
    await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "price.overridden",
        details: `${name}: ${from} → ${to}`,
        metadata: { productId, from, to },
      }),
    });
  } catch {
    // Non-fatal
  }
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return el.isContentEditable;
}

export function BillPanel() {
  const store = useCartStore();
  const totals = cartTotals(store);
  const tier = store.customerPriceTier;
  const px = (l: (typeof store.lines)[0]) =>
    effectivePrice(l, store.isWholesale, tier);
  const cat = (l: (typeof store.lines)[0]) =>
    catalogPrice(l, store.isWholesale, tier);
  const isOver = (l: (typeof store.lines)[0]) =>
    isPriceOverridden(l, store.isWholesale, tier);
  const moqWarn = lineMoqWarnings(store.lines, store.isWholesale, tier);
  const activeTier = resolveActiveTier({
    isWholesaleMode: store.isWholesale,
    customerTier: tier,
  });
  const reducedMotion = useReducedMotion();
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [customerPaid, setCustomerPaid] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [splitCard, setSplitCard] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Sale | null>(null);
  const [waStatus, setWaStatus] = useState<string | null>(null);
  const [receiptStatus, setReceiptStatus] = useState<string | null>(null);
  const [loyalty, setLoyalty] = useState({ perCurrency: 100, value: 1 });
  const [earnedMsg, setEarnedMsg] = useState<string | null>(null);
  const [heldBills, setHeldBills] = useState<
    { id: string; label: string; createdAt: string }[]
  >([]);
  const [recallOpen, setRecallOpen] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([]);
  const [fxCode, setFxCode] = useState("");
  const [fxAmount, setFxAmount] = useState("");
  const [priceEditNonce, setPriceEditNonce] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [taxInclusive, setTaxInclusive] = useState(true);
  const [businessName, setBusinessName] = useState("Store");
  const [trainingMode, setTrainingMode] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [expandedLine, setExpandedLine] = useState<string | null>(null);
  const [licenceExpired, setLicenceExpired] = useState(false);
  const [registerOpen, setRegisterOpen] = useState<boolean | null>(null);

  const customerNameRef = useRef<HTMLInputElement>(null);
  const employeeRef = useRef<HTMLInputElement>(null);
  const paidRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) return;
        setLoyalty({
          perCurrency: Number(j.data.pointsPerCurrency) || 100,
          value: Number(j.data.pointsValue) || 1,
        });
        setTaxPercent(Number(j.data.taxPercent) || 0);
        setTaxInclusive(j.data.taxInclusive !== "No");
        setBusinessName(String(j.data.businessName || "Store"));
        setTrainingMode(j.data.trainingMode === "Yes");
      })
      .catch(() => undefined);
    fetch("/api/collections/currency")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.data)) setCurrencies(j.data);
      })
      .catch(() => undefined);
    fetch("/api/tenant")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data?.expired) setLicenceExpired(true);
      })
      .catch(() => undefined);
    fetch("/api/register")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setRegisterOpen(Boolean(j.data?.open));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        DISPLAY_KEY,
        JSON.stringify({
          total: totals.total,
          businessName,
          lines: store.lines.map((l) => ({
            name: l.name,
            qty: l.quantity,
            amount:
              (px(l) - l.discount) * l.quantity,
          })),
        }),
      );
    } catch {
      // ignore
    }
  }, [store.lines, store.isWholesale, totals.total, businessName]);

  const refreshHeld = useCallback(() => {
    fetch("/api/held-bills")
      .then((r) => r.json())
      .then((j) => j.success && setHeldBills(j.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshHeld();
  }, [refreshHeld]);

  async function printReceipt(sale: Sale) {
    setReceiptStatus("Printing…");
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station: "RECEIPT",
          content: saleToTicketText(sale),
        }),
      });
      const json = await res.json();
      setReceiptStatus(json.success ? "Printed ✓" : (json.error ?? "Failed"));
    } catch {
      setReceiptStatus("Print failed");
    }
  }

  async function sendWhatsApp(sale: Sale) {
    const mobile =
      sale.customerMobile ||
      (typeof window !== "undefined"
        ? window.prompt("Customer WhatsApp number")
        : null);
    if (!mobile) return;
    setWaStatus("Sending…");
    try {
      const res = await fetch(`/api/sales/${sale.id}/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const json = await res.json();
      setWaStatus(json.success ? "Sent ✓" : (json.error ?? "Failed"));
    } catch {
      setWaStatus("Failed to send");
    }
  }

  async function openDrawer() {
    const pin = window.prompt(
      "Manager PIN to open drawer (optional — Cancel to abort, OK blank to skip)",
    );
    if (pin === null) return;
    if (pin) {
      const ok = await verifyManagerPin("Confirm manager PIN");
      if (!ok) {
        setDrawerStatus("Invalid PIN");
        return;
      }
    }
    setDrawerStatus("Opening…");
    try {
      const res = await fetch("/api/print", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kick: true }),
      });
      const json = await res.json();
      setDrawerStatus(
        json.success ? "Drawer kicked ✓" : (json.error ?? "Failed"),
      );
    } catch {
      setDrawerStatus("Drawer failed");
    }
  }

  async function applyDiscountCode() {
    const code = window.prompt("Discount code");
    if (!code?.trim()) return;
    try {
      const subtotal = totals.subtotal - totals.lineDiscount;
      const res = await fetch("/api/commerce/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), subtotal, consume: true }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Invalid code");
        return;
      }
      const amount = Number(json.data?.discount) || 0;
      store.setFinalDiscount(store.finalDiscount + amount);
      setError(null);
    } catch {
      setError("Could not apply discount code");
    }
  }

  async function checkVoucher() {
    const code = window.prompt("Voucher / gift card code");
    if (!code?.trim()) return;
    try {
      const res = await fetch("/api/collections/vouchers");
      const json = await res.json();
      if (!json.success) {
        setError("Could not load vouchers");
        return;
      }
      const needle = code.trim().toLowerCase();
      const found = (
        json.data as {
          code?: string;
          amount?: number;
          status?: string;
          title?: string;
        }[]
      ).find(
        (v) =>
          String(v.code ?? "").toLowerCase() === needle ||
          String(v.title ?? "").toLowerCase() === needle,
      );
      if (!found) {
        setError(`No voucher for “${code.trim()}”`);
        return;
      }
      const bal = Number(found.amount) || 0;
      const redeem = window.confirm(
        `Voucher ${found.code ?? code}: balance ${formatMoney(bal)}${found.status ? ` (${found.status})` : ""}.\nRedeem against this bill?`,
      );
      if (redeem && bal > 0) {
        const room = Math.max(
          0,
          totals.subtotal - totals.lineDiscount - store.finalDiscount,
        );
        store.setFinalDiscount(store.finalDiscount + Math.min(bal, room));
        setError(null);
      } else {
        setError(`Voucher balance: ${formatMoney(bal)}`);
      }
    } catch {
      setError("Voucher check failed");
    }
  }

  // Loyalty redeem: cap by available points and remaining discountable amount.
  const afterLines = totals.subtotal - totals.lineDiscount;
  const redeemRoom = Math.max(0, afterLines - totals.finalDiscount);
  const redeemPoints = Math.min(store.redeemPoints, store.customerPoints);
  const redeemValue = Math.min(redeemPoints * loyalty.value, redeemRoom);
  const pointsUsed =
    loyalty.value > 0 ? Math.round(redeemValue / loyalty.value) : 0;
  const chargedTotal = Math.max(0, totals.total - redeemValue);

  let taxShown = 0;
  if (taxPercent > 0) {
    taxShown = taxInclusive
      ? chargedTotal - chargedTotal / (1 + taxPercent / 100)
      : chargedTotal * (taxPercent / 100);
  }

  const paid = Number(customerPaid) || 0;
  const balance = paid - chargedTotal;
  const finalPct =
    afterLines > 0 ? (totals.finalDiscount / afterLines) * 100 : 0;

  const splitCashN = Number(splitCash) || 0;
  const splitCardN = Number(splitCard) || 0;
  const splitSum = splitCashN + splitCardN;

  const selectedFx = currencies.find((c) => c.code === fxCode);
  const fxForeign = Number(fxAmount) || 0;
  const fxLkr =
    selectedFx && selectedFx.rate > 0 ? fxForeign * selectedFx.rate : 0;

  async function applyUnitPrice(productId: string, raw: string) {
    const line = store.lines.find((l) => l.productId === productId);
    if (!line) return;
    const next = Number(raw);
    if (Number.isNaN(next) || next < 0) return;
    const current = px(line);
    if (Math.abs(next - current) < 0.001) return;

    // Custom lines: free override. Stock: PIN when leaving catalog price.
    if (!line.custom) {
      const catalog = cat(line);
      if (Math.abs(next - catalog) > 0.001) {
        const ok = await verifyManagerPin(
          "Manager PIN required for price override",
          "price_override",
        );
        if (!ok) {
          setError("Invalid manager PIN — price not changed");
          setPriceEditNonce((n) => n + 1);
          return;
        }
        void auditPriceOverride(line.productId, line.name, catalog, next);
      }
    }
    store.setUnitPrice(productId, next);
  }

  async function verifyManagerPinIfNeeded(): Promise<boolean> {
    const needsDiscountPin =
      finalPct > MANAGER_DISCOUNT_PCT ||
      store.lines.some(
        (l) =>
          l.maxDiscount > 0 &&
          l.discount >= l.maxDiscount * 0.95 &&
          l.discount > 0,
      );
    const needsPricePin = store.lines.some((l) =>
      isOver(l),
    );
    if (!needsDiscountPin && !needsPricePin) return true;
    const reason = [
      needsDiscountPin && "discount > 20% or near max",
      needsPricePin && "price override",
    ]
      .filter(Boolean)
      .join("; ");
    const permission = needsPricePin
      ? "price_override"
      : needsDiscountPin
        ? "discount_override"
        : undefined;
    const ok = await verifyManagerPin(
      `Manager PIN required (${reason})`,
      permission,
    );
    if (!ok) {
      setError("Invalid manager PIN or permission denied");
      return false;
    }
    return true;
  }

  const proceed = useCallback(async () => {
    if (store.lines.length === 0) return;
    if (licenceExpired) {
      setError("Licence expired — renew before selling");
      return;
    }
    if (method === "cash" && paid < chargedTotal) {
      setError("Customer paid is less than the total");
      return;
    }
    if (method === "split") {
      if (splitSum + 0.01 < chargedTotal) {
        setError("Split amounts must cover the total");
        return;
      }
    }

    const pinOk = await verifyManagerPinIfNeeded();
    if (!pinOk) return;

    const empRaw = store.employee || "";
    const employee = trainingMode
      ? empRaw.startsWith("[TRAINING]")
        ? empRaw
        : `[TRAINING]${empRaw || "cashier"}`
      : empRaw || undefined;

    const saleBody = {
      lines: store.lines.map((l) => {
        const price = px(l);
        const priceOverridden = isOver(l);
        const variant = isVariantLine(l.productId);
        return {
          productId: l.productId,
          quantity: l.quantity,
          discount: l.discount,
          name: l.custom || variant ? l.name : undefined,
          unitPrice: l.custom || priceOverridden || variant ? price : undefined,
          custom: l.custom || undefined,
          serial: l.serial || undefined,
          modifiers: l.modifiers,
          variantId: l.variantId || undefined,
        };
      }),
      paymentMethod: method,
      isWholesale: store.isWholesale,
      serviceCharge: store.serviceCharge,
      finalDiscount: store.finalDiscount + redeemValue,
      customerName: store.customerName || undefined,
      customerMobile: store.customerMobile || undefined,
      employee,
      cashReceived: method === "cash" ? paid : undefined,
      cashAmount: method === "split" ? splitCashN : undefined,
      cardAmount: method === "split" ? splitCardN : undefined,
      clientUuid: crypto.randomUUID(),
      // Card/online must stay pending until gateway webhook verifies payment.
      ...(method === "card"
        ? { status: "pending" as const, paymentStatus: "pending" }
        : {}),
    };

    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleBody),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Sale failed");
        return;
      }
      const sale = json.data as Sale;

      if (method === "card" && sale.status === "pending") {
        const payRes = await fetch("/api/pos/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: sale.receiptNo || sale.id,
            amountMinor: Math.round(Number(sale.total) * 100),
            currency: "LKR",
            description: `POS ${sale.receiptNo || sale.id}`,
            customer: {
              name: store.customerName || store.employee || "Walk-in",
              email: "",
              phone: store.customerMobile || undefined,
            },
          }),
        });
        const payJson = await payRes.json();
        if (!payJson.success) {
          setError(
            payJson.error ??
              "Card gateway not configured. Set WebXPay staging keys, or use cash.",
          );
          return;
        }
        const checkout = payJson.data as {
          mode?: string;
          formAction?: string;
          formFields?: Record<string, string>;
          url?: string;
        };
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
        if (checkout.url) {
          window.location.href = checkout.url;
          return;
        }
        setError("Gateway did not return a checkout form");
        return;
      }

      setDone(sale);
      setPayOpen(false);
      setExpandedLine(null);

      if (store.customerId) {
        const earn = Math.floor(sale.total / loyalty.perCurrency);
        try {
          const lr = await fetch("/api/loyalty", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: store.customerId,
              earn,
              redeem: pointsUsed,
            }),
          });
          const lj = await lr.json();
          if (lj.success) {
            setEarnedMsg(
              `+${earn} pts${pointsUsed ? `, −${pointsUsed} redeemed` : ""} · balance ${lj.data.points}`,
            );
          }
        } catch {
          // Non-fatal
        }
      }

      store.clear();
      setCustomerPaid("");
      setSplitCash("");
      setSplitCard("");
    } catch {
      const queued = enqueueFailedSale(saleBody);
      setError(
        queued
          ? "Offline — sale queued; will sync when online"
          : "Sale failed — connection error. Offline POS is disabled; retry when online.",
      );
    } finally {
      setPending(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pin check uses latest store
  }, [
    store,
    method,
    paid,
    chargedTotal,
    splitSum,
    splitCashN,
    splitCardN,
    redeemValue,
    loyalty.perCurrency,
    pointsUsed,
    finalPct,
    trainingMode,
    licenceExpired,
  ]);

  async function holdCurrentBill() {
    if (store.lines.length === 0) return;
    const label =
      window.prompt("Hold label (optional)", store.customerName || "") ?? "";
    try {
      const res = await fetch("/api/held-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim() || undefined,
          isWholesale: store.isWholesale,
          serviceCharge: store.serviceCharge,
          finalDiscount: store.finalDiscount,
          customerName: store.customerName,
          customerMobile: store.customerMobile,
          employee: store.employee,
          customerId: store.customerId,
          customerPoints: store.customerPoints,
          customerPriceTier: store.customerPriceTier,
          customerCreditLimit: store.customerCreditLimit,
          lines: store.lines,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Hold failed");
        return;
      }
      store.clear();
      refreshHeld();
    } catch {
      setError("Could not hold bill");
    }
  }

  async function recallBill(id: string) {
    try {
      const res = await fetch(`/api/held-bills?id=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Recall failed");
        return;
      }
      store.restoreFromHeld(json.data);
      await fetch(`/api/held-bills?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      refreshHeld();
      setRecallOpen(false);
    } catch {
      setError("Could not recall bill");
    }
  }

  function addNonStock() {
    const name = window.prompt("Item name");
    if (!name?.trim()) return;
    const priceStr = window.prompt("Unit price (Rs)");
    const unitPrice = Number(priceStr);
    if (!priceStr || Number.isNaN(unitPrice) || unitPrice < 0) {
      setError("Invalid price");
      return;
    }
    store.addCustomLine({ name: name.trim(), unitPrice });
  }

  // Keyboard shortcuts: F1–F4 and INSERT always; ignore when typing for others
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typing = isTypingTarget(e.target);
      const key = e.key;

      if (key === "F1") {
        e.preventDefault();
        setMethod("cash");
        setPayOpen(true);
        return;
      }
      if (key === "F2") {
        e.preventDefault();
        setPayOpen(true);
        requestAnimationFrame(() => customerNameRef.current?.focus());
        return;
      }
      if (key === "F3") {
        e.preventDefault();
        setMoreOpen(true);
        requestAnimationFrame(() => employeeRef.current?.focus());
        return;
      }
      if (key === "F4") {
        e.preventDefault();
        setPayOpen(true);
        requestAnimationFrame(() => paidRef.current?.focus());
        return;
      }
      if (key === "Insert") {
        e.preventDefault();
        if (done) {
          setDone(null);
          setWaStatus(null);
          setReceiptStatus(null);
          setEarnedMsg(null);
        } else if (!payOpen && store.lines.length > 0) {
          setPayOpen(true);
        } else if (!pending && store.lines.length > 0) {
          void proceed();
        }
        return;
      }
      if (typing) return;
      // CTRL hint is visual only; no global action required
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, pending, store.lines.length, proceed, payOpen]);

  if (done) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-line bg-surface-1 p-6 text-center sm:p-8">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 text-2xl text-accent"
          aria-hidden
        >
          ✓
        </motion.div>
        <h2 className="mt-4 font-mono text-lg font-semibold text-text-strong">
          {done.id}
        </h2>
        <p className="mt-1 font-mono text-3xl font-bold text-accent">
          {formatMoney(done.total)}
        </p>
        {done.change != null && done.change > 0 && (
          <p className="mt-1 text-sm text-text-dim">
            Change due: {formatMoney(done.change)}
          </p>
        )}
        {earnedMsg && (
          <p className="mt-2 rounded-lg bg-accent/10 px-3 py-1 text-xs text-accent">
            {earnedMsg}
          </p>
        )}

        <div className="mt-6 grid w-full grid-cols-2 gap-2">
          <a
            href={`/api/sales/${done.id}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-line py-2.5 text-center text-sm text-text-body transition duration-150 hover:border-accent hover:text-accent"
          >
            Invoice PDF
          </a>
          <button
            onClick={() => printReceipt(done)}
            className="rounded-xl border border-line py-2.5 text-sm text-text-body transition duration-150 hover:border-accent hover:text-accent"
          >
            {receiptStatus ?? "Print receipt"}
          </button>
        </div>
        <button
          onClick={() => sendWhatsApp(done)}
          className="mt-2 w-full rounded-xl border border-line py-2.5 text-sm text-text-body transition duration-150 hover:border-accent hover:text-accent"
        >
          {waStatus ?? "Send invoice on WhatsApp"}
        </button>

        <button
          onClick={() => {
            setDone(null);
            setWaStatus(null);
            setReceiptStatus(null);
            setEarnedMsg(null);
          }}
          className="mt-3 w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink transition duration-150 hover:bg-accent-strong"
        >
          New sale (INSERT)
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reducedMotion ? { duration: 0 } : springSoft}
      className="pos-ticket flex h-full min-h-0 flex-col overflow-hidden"
    >
      {trainingMode && (
        <div className="border-b border-warn/30 bg-warn/15 px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-warn">
          Training — sales not stocked
        </div>
      )}
      {licenceExpired && (
        <div className="border-b border-danger/40 bg-danger/15 px-3 py-1.5 text-center text-[11px] font-medium text-danger">
          Licence expired — renew in Admin / Billing before selling
        </div>
      )}
      {registerOpen === false && (
        <div className="border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-center text-[11px] text-warn">
          Register shift is closed — open a shift on Register for cash control
        </div>
      )}
      <div
        className={`border-b px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${
          activeTier === "retail"
            ? "border-line bg-surface-2 text-text-dim"
            : "border-accent/30 bg-accent/10 text-accent"
        }`}
      >
        {PRICE_TIER_LABELS[activeTier]} pricing
        {store.isWholesale ? " · wholesale mode" : " · retail mode"}
        {store.customerCreditLimit > 0
          ? ` · credit limit ${formatMoney(store.customerCreditLimit)}`
          : ""}
      </div>
      {moqWarn.length > 0 && (
        <div className="border-b border-warn/30 bg-warn/10 px-3 py-1.5 text-[11px] text-warn">
          MOQ:{" "}
          {moqWarn
            .map((w) => `${w.name} needs ${w.moq}+ (short ${w.need})`)
            .join(" · ")}
        </div>
      )}
      <div className="pos-ticket-head flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-dim">
            Ticket
          </p>
          <h2 className="font-mono text-sm font-semibold tabular-nums text-text-strong">
            {store.lines.length} line{store.lines.length === 1 ? "" : "s"}
          </h2>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <button
            type="button"
            onClick={() => void holdCurrentBill()}
            disabled={store.lines.length === 0}
            className="rounded px-2 py-1 text-[11px] text-text-dim hover:text-accent disabled:opacity-40"
          >
            Hold
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                refreshHeld();
                setRecallOpen((o) => !o);
              }}
              className="rounded px-2 py-1 text-[11px] text-text-dim hover:text-accent"
            >
              Recall {heldBills.length ? `(${heldBills.length})` : ""}
            </button>
            {recallOpen && (
              <ul className="absolute right-0 z-30 mt-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-line bg-surface-2 shadow-xl">
                {heldBills.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-text-dim">
                    No held bills
                  </li>
                ) : (
                  heldBills.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        onClick={() => void recallBill(b.id)}
                        className="w-full px-3 py-2 text-left text-xs text-text-strong hover:bg-surface-3"
                      >
                        {b.label}
                        <span className="mt-0.5 block text-[10px] text-text-dim">
                          {b.id}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
            className={`rounded px-2 py-1 text-[11px] ${
              moreOpen ? "text-accent" : "text-text-dim hover:text-accent"
            }`}
          >
            More
          </button>
        </div>
      </div>

      {/* Cart lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {store.lines.length === 0 ? (
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-wider text-text-dim">
            Scan to start
          </p>
        ) : (
          <ul className="divide-y divide-dashed divide-line/80">
            {store.lines.map((l) => {
              const open = expandedLine === l.productId;
              const lineTotal =
                (px(l) - l.discount) * l.quantity;
              return (
                <li key={l.productId} className="py-1.5">
                  <div className="flex items-baseline gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLine(open ? null : l.productId)
                      }
                      className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
                    >
                      <span className="w-6 shrink-0 font-mono text-xs tabular-nums text-text-dim">
                        {l.quantity}×
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-text-strong">
                        {l.name}
                      </span>
                      <span className="shrink-0 font-mono text-sm tabular-nums text-text-strong">
                        {formatMoney(lineTotal)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => store.remove(l.productId)}
                      className="text-xs text-text-dim hover:text-danger"
                      aria-label={`Remove ${l.name}`}
                    >
                      ×
                    </button>
                  </div>
                  {open && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-6">
                      <StepBtn
                        label="−"
                        onClick={() =>
                          store.setQuantity(l.productId, l.quantity - 1)
                        }
                      />
                      <span className="w-8 text-center font-mono text-sm tabular-nums">
                        {l.quantity}
                      </span>
                      <StepBtn
                        label="+"
                        onClick={() =>
                          store.setQuantity(l.productId, l.quantity + 1)
                        }
                      />
                      {activeTier !== "retail" &&
                        WHOLESALE_QTY_PRESETS.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => store.setQuantity(l.productId, q)}
                            className="rounded border border-line px-1.5 py-0.5 text-[10px] text-text-dim hover:border-accent hover:text-accent"
                          >
                            {q}
                          </button>
                        ))}
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={px(l)}
                        key={`${l.productId}-${store.isWholesale}-${tier ?? ""}-${px(l)}-${priceEditNonce}`}
                        onBlur={(e) =>
                          void applyUnitPrice(l.productId, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        title="Unit price (PIN required to override catalog)"
                        aria-label={`Unit price for ${l.name}`}
                        className={`w-20 rounded border bg-surface-1 px-2 py-1 font-mono text-xs tabular-nums outline-none focus:border-accent ${
                          isOver(l)
                            ? "border-warn text-warn"
                            : "border-line"
                        }`}
                      />
                      {l.maxDiscount > 0 && (
                        <input
                          type="number"
                          min={0}
                          max={l.maxDiscount}
                          value={l.discount || ""}
                          placeholder="disc"
                          onChange={(e) =>
                            store.setDiscount(l.productId, Number(e.target.value))
                          }
                          title={`Max discount ${l.maxDiscount}`}
                          className="w-16 rounded border border-line bg-surface-1 px-2 py-1 font-mono text-xs outline-none focus:border-accent"
                        />
                      )}
                      {!l.custom && moreOpen && (
                        <input
                          value={l.serial ?? ""}
                          onChange={(e) =>
                            store.setSerial(l.productId, e.target.value)
                          }
                          placeholder="Serial / IMEI"
                          className="w-full rounded border border-line bg-surface-1 px-2 py-1 text-[11px] outline-none focus:border-accent"
                        />
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals + payment */}
      <div className="pos-ticket-foot max-h-[48%] shrink-0 overflow-y-auto px-3 py-3">
        <Row label="Sub total" value={formatMoney(totals.subtotal)} />
        {totals.lineDiscount > 0 && (
          <Row
            label="Item discounts"
            value={`-${formatMoney(totals.lineDiscount)}`}
            tone="warn"
          />
        )}

        {moreOpen && (
          <div className="mt-2 space-y-2 rounded-lg border border-dashed border-line p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-dim">
              Checkout options
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={addNonStock}
                className="rounded border border-line px-2 py-1 text-[11px] text-text-dim hover:text-accent"
              >
                Add non-stock
              </button>
              <button
                type="button"
                onClick={() => void checkVoucher()}
                className="rounded border border-line px-2 py-1 text-[11px] text-text-dim hover:text-accent"
              >
                Check voucher
              </button>
              <button
                type="button"
                onClick={() => void applyDiscountCode()}
                className="rounded border border-line px-2 py-1 text-[11px] text-text-dim hover:text-accent"
              >
                Discount code
              </button>
              <button
                type="button"
                onClick={() => void openDrawer()}
                className="rounded border border-line px-2 py-1 text-[11px] text-text-dim hover:text-accent"
              >
                {drawerStatus ?? "Open drawer"}
              </button>
            </div>
            <Field label="Service charge">
              <NumberInput
                value={store.serviceCharge}
                onChange={store.setServiceCharge}
                placeholder="0"
              />
            </Field>
            <Field label="Final discount (Rs)">
              <NumberInput
                value={store.finalDiscount}
                onChange={store.setFinalDiscount}
                placeholder="0"
              />
            </Field>
            <Field label="Final discount (%)">
              <NumberInput
                value={Number(finalPct.toFixed(2))}
                onChange={(pct) => {
                  const base = totals.subtotal - totals.lineDiscount;
                  store.setFinalDiscount((base * pct) / 100);
                }}
                placeholder="0"
              />
            </Field>
            {currencies.length > 0 && (
              <div className="rounded-lg border border-line bg-surface-1 p-2">
                <p className="mb-2 text-xs font-medium text-text-dim">
                  Foreign tender (optional · settles in LKR)
                </p>
                <div className="flex gap-2">
                  <select
                    value={fxCode}
                    onChange={(e) => setFxCode(e.target.value)}
                    className="rounded border border-line bg-surface-1 px-2 py-1.5 text-xs text-text-strong outline-none focus:border-accent"
                  >
                    <option value="">—</option>
                    {currencies.map((c) => (
                      <option key={c.id ?? c.code} value={c.code}>
                        {c.code}
                        {c.name ? ` · ${c.name}` : ""} ({c.rate})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={fxAmount}
                    onChange={(e) => setFxAmount(e.target.value)}
                    placeholder="Amount"
                    disabled={!fxCode}
                    className="w-24 rounded border border-line bg-surface-1 px-2 py-1.5 text-right text-xs text-text-strong outline-none focus:border-accent disabled:opacity-40"
                  />
                </div>
                {fxLkr > 0 && (
                  <p className="mt-2 text-right text-xs text-accent">
                    ≈ {formatMoney(fxLkr)} LKR
                    {Math.abs(fxLkr - chargedTotal) > 0.5 && (
                      <span className="ml-1 text-text-dim">
                        (total {formatMoney(chargedTotal)})
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
            <input
              ref={employeeRef}
              value={store.employee}
              onChange={(e) => store.setEmployee(e.target.value)}
              placeholder="Employee (F3)"
              className="w-full rounded-lg border border-line bg-surface-1 px-3 py-2 text-sm text-text-strong outline-none focus:border-accent"
            />
          </div>
        )}

        {redeemValue > 0 && (
          <Row
            label={`Points redeemed (${pointsUsed})`}
            value={`-${formatMoney(redeemValue)}`}
            tone="warn"
          />
        )}

        {taxPercent > 0 && taxShown > 0 && (
          <Row
            label={`Est. tax ${taxPercent}% (${taxInclusive ? "incl." : "excl."})`}
            value={formatMoney(taxShown)}
          />
        )}

        <div className="mt-2 flex items-end justify-between border-t border-dashed border-line pt-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
            Total
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-text-strong">
            {formatMoney(chargedTotal)}
          </p>
        </div>

        {!payOpen ? (
          <>
            {licenceExpired && (
              <p className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] text-danger">
                Selling is blocked until the licence is renewed.
              </p>
            )}
            <button
              type="button"
              disabled={store.lines.length === 0 || licenceExpired}
              onClick={() => setPayOpen(true)}
              className="mt-3 w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Take payment
            </button>
          </>
        ) : (
          <div className="mt-3 space-y-2 border-t border-dashed border-line pt-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                Tender
              </p>
              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="text-[11px] text-text-dim hover:text-accent"
              >
                Back to bill
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`rounded-lg border py-2 text-xs font-medium ${
                    method === m.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-text-dim"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {method === "card" && (
              <p className="rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[11px] text-text-dim">
                Card charges stay <span className="font-medium text-text-body">pending</span> until
                WebXPay verifies payment. Stock is not reduced until the gateway callback succeeds.
              </p>
            )}

            <div>
              {store.customerId ? (
                <div className="rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-strong">
                        {store.customerName || "Customer"}
                        {store.memberDiscountPercent != null && (
                          <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                            Member −{store.memberDiscountPercent}%
                          </span>
                        )}
                        {store.customerPriceTier &&
                          store.customerPriceTier !== "retail" && (
                            <span className="ml-2 rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                              {PRICE_TIER_LABELS[store.customerPriceTier]}
                            </span>
                          )}
                      </p>
                      <p className="text-xs text-text-dim">
                        {store.customerMobile} · {store.customerPoints} points
                        {store.customerCreditLimit > 0
                          ? ` · credit ${formatMoney(store.customerCreditLimit)}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => store.clearCustomer()}
                      className="text-xs text-text-dim hover:text-danger"
                    >
                      Change
                    </button>
                  </div>
                  {store.customerPoints > 0 && (
                    <label className="mt-2 flex items-center justify-between gap-2 text-xs text-text-dim">
                      Redeem points
                      <input
                        type="number"
                        min={0}
                        max={store.customerPoints}
                        value={store.redeemPoints || ""}
                        placeholder="0"
                        onChange={(e) =>
                          store.setRedeemPoints(Number(e.target.value))
                        }
                        className="w-24 rounded border border-line bg-surface-1 px-2 py-1 text-right text-text-strong outline-none focus:border-accent"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <>
                  <CustomerPicker onSelect={store.selectCustomer} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      ref={customerNameRef}
                      value={store.customerName}
                      onChange={(e) => store.setCustomerName(e.target.value)}
                      placeholder="Walk-in (F2)"
                      className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <input
                      value={store.customerMobile}
                      onChange={(e) => store.setCustomerMobile(e.target.value)}
                      placeholder="Mobile"
                      className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                  </div>
                </>
              )}
            </div>

            {method === "cash" && (
              <div>
                <Field label="Paid (F4)">
                  <input
                    ref={paidRef}
                    type="number"
                    min={0}
                    value={customerPaid}
                    placeholder="0"
                    onChange={(e) => setCustomerPaid(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-right font-mono text-sm tabular-nums outline-none focus:border-accent"
                  />
                </Field>
                <p
                  className={`mt-1 text-right font-mono text-sm tabular-nums ${
                    balance < 0 ? "text-danger" : "text-text-dim"
                  }`}
                >
                  Change {formatMoney(Math.max(balance, 0))}
                </p>
              </div>
            )}

            {method === "split" && (
              <div className="space-y-2">
                <Field label="Cash amount">
                  <NumberInput
                    value={splitCashN}
                    onChange={(v) => setSplitCash(String(v))}
                    placeholder="0"
                  />
                </Field>
                <Field label="Card amount">
                  <NumberInput
                    value={splitCardN}
                    onChange={(v) => setSplitCard(String(v))}
                    placeholder="0"
                  />
                </Field>
                <p
                  className={`text-right font-mono text-xs ${
                    splitSum + 0.01 < chargedTotal ? "text-danger" : "text-text-dim"
                  }`}
                >
                  Tendered {formatMoney(splitSum)} / {formatMoney(chargedTotal)}
                </p>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <motion.button
              whileTap={
                reducedMotion || !store.lines.length ? undefined : { scale: 0.98 }
              }
              disabled={
                pending ||
                store.lines.length === 0 ||
                (method === "cash" && balance < 0) ||
                (method === "split" && splitSum + 0.01 < chargedTotal)
              }
              onClick={() => void proceed()}
              className="w-full rounded-xl bg-accent py-3.5 font-semibold text-accent-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending
                ? "Processing…"
                : method === "card"
                  ? `Pay by card · ${formatMoney(chargedTotal)}`
                  : `Charge · ${formatMoney(chargedTotal)}`}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
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

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-text-dim">{label}</p>
      <p className={tone === "warn" ? "text-warn" : "text-text-body"}>{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-text-dim">{label}</label>
      <div className="w-28">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-right text-sm text-text-strong outline-none focus:border-accent"
    />
  );
}
