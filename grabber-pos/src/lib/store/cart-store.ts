import { create } from "zustand";
import type { CartLine, Product } from "@/lib/types";

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
  redeemPoints: number;

  addProduct: (product: Product) => void;
  addCustomLine: (input: {
    name: string;
    unitPrice: number;
    quantity?: number;
  }) => void;
  setQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discount: number) => void;
  /** Override unit price. Custom lines free; stock lines update retail or wholesale. */
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
  }) => void;
  clearCustomer: () => void;
  setRedeemPoints: (v: number) => void;
}

function clampDiscount(value: number, max: number): number {
  if (Number.isNaN(value) || value < 0) return 0;
  return Math.min(value, max);
}

/** Effective unit price given the current wholesale toggle. */
export function effectivePrice(line: CartLine, isWholesale: boolean): number {
  return isWholesale && line.wholesalePrice != null
    ? line.wholesalePrice
    : line.unitPrice;
}

/** Catalog (pre-override) price for the current mode. */
export function catalogPrice(line: CartLine, isWholesale: boolean): number {
  if (isWholesale && line.catalogWholesalePrice != null) {
    return line.catalogWholesalePrice;
  }
  return line.catalogUnitPrice ?? line.unitPrice;
}

/** True when stock line unit price was changed from catalog. */
export function isPriceOverridden(line: CartLine, isWholesale: boolean): boolean {
  if (line.custom) return false;
  return Math.abs(effectivePrice(line, isWholesale) - catalogPrice(line, isWholesale)) > 0.001;
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
  redeemPoints: 0,

  addProduct: (product) =>
    set((state) => {
      const existing = state.lines.find((l) => l.productId === product.id);
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: Math.min(l.quantity + 1, l.available || 9999) }
              : l,
          ),
        };
      }
      const line: CartLine = {
        productId: product.id,
        name: product.name,
        unitPrice: product.salePrice,
        wholesalePrice: product.wholesalePrice,
        catalogUnitPrice: product.salePrice,
        catalogWholesalePrice: product.wholesalePrice,
        quantity: 1,
        discount: clampDiscount(product.singleDiscount, product.maxDiscount),
        maxDiscount: product.maxDiscount,
        available: product.quantity,
        variantId: product.variantId ?? null,
      };
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
        catalogUnitPrice: price,
        catalogWholesalePrice: null,
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
          : state.lines.map((l) =>
              l.productId === productId ? { ...l, quantity } : l,
            ),
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
      return {
        lines: state.lines.map((l) => {
          if (l.productId !== productId) return l;
          // Custom: free override of unitPrice (no max).
          if (l.custom) return { ...l, unitPrice: next };
          // Stock: override the price used by the current mode.
          if (state.isWholesale && l.wholesalePrice != null) {
            return { ...l, wholesalePrice: next };
          }
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
      redeemPoints: 0,
    }),

  setWholesale: (on) => set({ isWholesale: on }),
  setServiceCharge: (v) => set({ serviceCharge: Math.max(0, v || 0) }),
  setFinalDiscount: (v) => set({ finalDiscount: Math.max(0, v || 0) }),
  setCustomerName: (v) => set({ customerName: v }),
  setCustomerMobile: (v) => set({ customerMobile: v }),
  setEmployee: (v) => set({ employee: v }),
  selectCustomer: (c) =>
    set({
      customerId: c.id,
      customerName: c.name,
      customerMobile: c.mobile,
      customerPoints: c.points,
      redeemPoints: 0,
    }),
  clearCustomer: () =>
    set({
      customerId: null,
      customerName: "",
      customerMobile: "",
      customerPoints: 0,
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
}): CartTotals {
  const subtotal = state.lines.reduce(
    (s, l) => s + effectivePrice(l, state.isWholesale) * l.quantity,
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
