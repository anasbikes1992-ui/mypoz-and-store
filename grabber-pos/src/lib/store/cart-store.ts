import { create } from "zustand";
import type { CartLine, Product } from "@/lib/types";
import {
  moqShortfall,
  resolveActiveTier,
  resolveTierUnitPrice,
  type PriceTier,
} from "@/lib/pricing-tiers";

/** Shape compatible with held-bills-store HeldBill for restore. */
export interface HeldBillSnapshot {
  isWholesale: boolean;
  serviceCharge: number;
  finalDiscount: number;
  customerName: string;
  customerMobile: string;
  employee: string;
  customerId: string | null;
  customerPoints: number;
  customerPriceTier?: PriceTier | null;
  customerCreditLimit?: number;
  lines: CartLine[];
}

interface CartState {
  lines: CartLine[];
  isWholesale: boolean;
  serviceCharge: number;
  finalDiscount: number;
  customerName: string;
  customerMobile: string;
  employee: string;
  /** Selected loyalty customer (null for walk-in). */
  customerId: string | null;
  customerPoints: number;
  customerPriceTier: PriceTier | null;
  customerCreditLimit: number;
  /** Active membership discount % when set. */
  memberDiscountPercent: number | null;
  redeemPoints: number;

  addProduct: (product: Product) => void;
  addCustomLine: (input: {
    name: string;
    unitPrice: number;
    quantity?: number;
  }) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discount: number) => void;
  /** Override unit price. Custom lines free; stock lines update active tier price. */
  setUnitPrice: (productId: string, price: number) => void;
  setSerial: (productId: string, serial: string) => void;
  setLineModifiers: (productId: string, modifiers: string[]) => void;
  remove: (productId: string) => void;
  clear: () => void;
  restoreFromHeld: (bill: HeldBillSnapshot) => void;

  setWholesale: (on: boolean) => void;
  setServiceCharge: (v: number) => void;
  setFinalDiscount: (v: number) => void;
  setCustomerName: (v: string) => void;
  setCustomerMobile: (v: string) => void;
  setEmployee: (v: string) => void;
  selectCustomer: (c: {
    id: string;
    name: string;
    mobile: string;
    points: number;
    memberDiscountPercent?: number | null;
    priceTier?: PriceTier | null;
    creditLimit?: number;
  }) => void;
  clearCustomer: () => void;
  setRedeemPoints: (v: number) => void;
}

function clampDiscount(value: number, max: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(value, max);
}

function activeTier(state: {
  isWholesale: boolean;
  customerPriceTier: PriceTier | null;
}): PriceTier {
  return resolveActiveTier({
    isWholesaleMode: state.isWholesale,
    customerTier: state.customerPriceTier,
  });
}

/** Effective unit price for the active customer/mode tier. */
export function effectivePrice(
  line: CartLine,
  isWholesale: boolean,
  customerTier: PriceTier | null = null,
): number {
  const tier = resolveActiveTier({
    isWholesaleMode: isWholesale,
    customerTier,
  });
  if (tier === "vip" && line.vipPrice != null) return line.vipPrice;
  if (tier === "wholesale" && line.wholesalePrice != null) {
    return line.wholesalePrice;
  }
  if (tier === "wholesale" || tier === "vip") {
    // Fall back through catalog resolver when line fields sparse.
    return resolveTierUnitPrice({
      tier,
      salePrice: line.unitPrice,
      wholesalePrice: line.wholesalePrice,
      vipPrice: line.vipPrice,
    });
  }
  return line.unitPrice;
}

/** Catalog (pre-override) price for the current mode/tier. */
export function catalogPrice(
  line: CartLine,
  isWholesale: boolean,
  customerTier: PriceTier | null = null,
): number {
  const tier = resolveActiveTier({
    isWholesaleMode: isWholesale,
    customerTier,
  });
  return resolveTierUnitPrice({
    tier,
    salePrice: line.catalogUnitPrice ?? line.unitPrice,
    wholesalePrice: line.catalogWholesalePrice ?? line.wholesalePrice,
    vipPrice: line.catalogVipPrice ?? line.vipPrice,
  });
}

/** True when stock line unit price was changed from catalog. */
export function isPriceOverridden(
  line: CartLine,
  isWholesale: boolean,
  customerTier: PriceTier | null = null,
): boolean {
  if (line.custom) return false;
  return (
    Math.abs(
      effectivePrice(line, isWholesale, customerTier) -
        catalogPrice(line, isWholesale, customerTier),
    ) > 0.001
  );
}

export function lineMoqWarnings(
  lines: CartLine[],
  isWholesale: boolean,
  customerTier: PriceTier | null,
): { productId: string; name: string; need: number; moq: number }[] {
  const tier = resolveActiveTier({
    isWholesaleMode: isWholesale,
    customerTier,
  });
  if (tier === "retail") return [];
  const out: { productId: string; name: string; need: number; moq: number }[] =
    [];
  for (const l of lines) {
    if (l.custom) continue;
    const moq = Math.max(0, Math.floor(Number(l.minWholesaleQty) || 0));
    const short = moqShortfall(l.quantity, moq);
    if (short > 0) {
      out.push({
        productId: l.productId,
        name: l.name,
        need: short,
        moq,
      });
    }
  }
  return out;
}

export const useCartStore = create<CartState>((set) => ({
  lines: [],
  isWholesale: false,
  serviceCharge: 0,
  finalDiscount: 0,
  customerName: "",
  customerMobile: "",
  employee: "",
  customerId: null,
  customerPoints: 0,
  customerPriceTier: null,
  customerCreditLimit: 0,
  memberDiscountPercent: null,
  redeemPoints: 0,

  addProduct: (product) =>
    set((state) => {
      const available = Math.max(0, Number(product.quantity) || 0);
      if (available <= 0 && !product.custom) {
        return state; // refuse zero-stock catalog lines (server also enforces)
      }
      const maxQty = available > 0 ? available : 9999;
      const existing = state.lines.find((l) => l.productId === product.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: Math.min(l.quantity + 1, l.available || maxQty) }
              : l,
          ),
        };
      }
      const tier = activeTier(state);
      const unit = resolveTierUnitPrice({
        tier: "retail",
        salePrice: product.salePrice,
        wholesalePrice: product.wholesalePrice,
        vipPrice: product.vipPrice,
      });
      const wholesale = product.wholesalePrice;
      const vip = product.vipPrice ?? null;
      // Seed line prices so effectivePrice can pick the active tier.
      const line: CartLine = {
        productId: product.id,
        name: product.name,
        unitPrice: unit,
        wholesalePrice: wholesale,
        vipPrice: vip,
        catalogUnitPrice: product.salePrice,
        catalogWholesalePrice: product.wholesalePrice,
        catalogVipPrice: product.vipPrice ?? null,
        minWholesaleQty: product.minWholesaleQty ?? 0,
        quantity: Math.max(
          1,
          tier !== "retail" && (product.minWholesaleQty ?? 0) > 1
            ? Math.min(product.minWholesaleQty ?? 1, maxQty)
            : 1,
        ),
        discount: clampDiscount(product.singleDiscount, product.maxDiscount),
        maxDiscount: product.maxDiscount,
        available,
        variantId: product.variantId ?? null,
      };
      if (line.quantity > maxQty) line.quantity = maxQty;
      return { lines: [...state.lines, line] };
    }),

  addCustomLine: ({ name, unitPrice, quantity = 1 }) =>
    set((state) => {
      const id = `CUSTOM-${Date.now().toString(36).toUpperCase()}`;
      const price = Math.max(0, unitPrice);
      const line: CartLine = {
        productId: id,
        name: name.trim() || "Custom item",
        unitPrice: price,
        wholesalePrice: null,
        vipPrice: null,
        catalogUnitPrice: price,
        catalogWholesalePrice: null,
        catalogVipPrice: null,
        minWholesaleQty: 0,
        quantity: Math.max(1, Math.floor(quantity) || 1),
        discount: 0,
        maxDiscount: 0,
        available: 9999,
        custom: true,
      };
      return { lines: [...state.lines, line] };
    }),

  setQuantity: (productId, quantity) =>
    set((state) => ({
      lines:
        quantity <= 0
          ? state.lines.filter((l) => l.productId !== productId)
          : state.lines.map((l) => {
              if (l.productId !== productId) return l;
              const cap =
                l.custom || !l.available || l.available <= 0
                  ? quantity
                  : Math.min(quantity, l.available);
              return { ...l, quantity: cap };
            }),
    })),

  setDiscount: (productId, discount) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId
          ? { ...l, discount: clampDiscount(discount, l.maxDiscount) }
          : l,
      ),
    })),

  setUnitPrice: (productId, price) =>
    set((state) => {
      const next = Math.max(0, Number(price) || 0);
      const tier = activeTier(state);
      return {
        lines: state.lines.map((l) => {
          if (l.productId !== productId) return l;
          if (l.custom) return { ...l, unitPrice: next };
          if (tier === "vip") return { ...l, vipPrice: next };
          if (tier === "wholesale") return { ...l, wholesalePrice: next };
          return { ...l, unitPrice: next };
        }),
      };
    }),

  setSerial: (productId, serial) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId ? { ...l, serial: serial.trim() } : l,
      ),
    })),

  setLineModifiers: (productId, modifiers) =>
    set((state) => ({
      lines: state.lines.map((l) =>
        l.productId === productId
          ? { ...l, modifiers: modifiers.filter(Boolean) }
          : l,
      ),
    })),

  remove: (productId) =>
    set((state) => ({
      lines: state.lines.filter((l) => l.productId !== productId),
    })),

  clear: () =>
    set({
      lines: [],
      serviceCharge: 0,
      finalDiscount: 0,
      customerName: "",
      customerMobile: "",
      employee: "",
      customerId: null,
      customerPoints: 0,
      customerPriceTier: null,
      customerCreditLimit: 0,
      memberDiscountPercent: null,
      redeemPoints: 0,
    }),

  restoreFromHeld: (bill) =>
    set({
      lines: bill.lines.map((l) => ({ ...l })),
      isWholesale: bill.isWholesale,
      serviceCharge: bill.serviceCharge,
      finalDiscount: bill.finalDiscount,
      customerName: bill.customerName,
      customerMobile: bill.customerMobile,
      employee: bill.employee,
      customerId: bill.customerId,
      customerPoints: bill.customerPoints,
      customerPriceTier: bill.customerPriceTier ?? null,
      customerCreditLimit: bill.customerCreditLimit ?? 0,
      memberDiscountPercent: null,
      redeemPoints: 0,
    }),

  setWholesale: (on) => set({ isWholesale: on }),
  setServiceCharge: (v) => set({ serviceCharge: Math.max(0, v || 0) }),
  setFinalDiscount: (v) => set({ finalDiscount: Math.max(0, v || 0) }),
  setCustomerName: (v) => set({ customerName: v }),
  setCustomerMobile: (v) => set({ customerMobile: v }),
  setEmployee: (v) => set({ employee: v }),
  selectCustomer: (c) =>
    set((state) => ({
      customerId: c.id,
      customerName: c.name,
      customerMobile: c.mobile,
      customerPoints: c.points,
      customerPriceTier: c.priceTier ?? null,
      customerCreditLimit: Math.max(0, Number(c.creditLimit) || 0),
      memberDiscountPercent:
        c.memberDiscountPercent != null && c.memberDiscountPercent > 0
          ? c.memberDiscountPercent
          : null,
      redeemPoints: 0,
      isWholesale:
        c.priceTier === "wholesale" || c.priceTier === "vip"
          ? true
          : state.isWholesale,
    })),
  clearCustomer: () =>
    set({
      customerId: null,
      customerName: "",
      customerMobile: "",
      customerPoints: 0,
      customerPriceTier: null,
      customerCreditLimit: 0,
      memberDiscountPercent: null,
      redeemPoints: 0,
    }),
  setRedeemPoints: (v) => set({ redeemPoints: Math.max(0, Math.floor(v || 0)) }),
}));

export interface CartTotals {
  subtotal: number;
  lineDiscount: number;
  finalDiscount: number;
  serviceCharge: number;
  total: number;
}

export function cartTotals(state: {
  lines: CartLine[];
  isWholesale: boolean;
  serviceCharge: number;
  finalDiscount: number;
  customerPriceTier?: PriceTier | null;
}): CartTotals {
  const tier = state.customerPriceTier ?? null;
  const subtotal = state.lines.reduce(
    (s, l) => s + effectivePrice(l, state.isWholesale, tier) * l.quantity,
    0,
  );
  const lineDiscount = state.lines.reduce(
    (s, l) => s + l.discount * l.quantity,
    0,
  );
  const afterLines = subtotal - lineDiscount;
  const finalDiscount = Math.min(Math.max(0, state.finalDiscount), afterLines);
  const total =
    afterLines - finalDiscount + Math.max(0, state.serviceCharge);
  return {
    subtotal,
    lineDiscount,
    finalDiscount,
    serviceCharge: state.serviceCharge,
    total,
  };
}
