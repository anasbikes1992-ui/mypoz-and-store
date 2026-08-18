import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

export interface HeldBillLine {
  productId: string;
  name: string;
  unitPrice: number;
  wholesalePrice: number | null;
  quantity: number;
  discount: number;
  maxDiscount: number;
  available: number;
  serial?: string;
  custom?: boolean;
  modifiers?: string[];
}

export interface HeldBill {
  id: string;
  label: string;
  createdAt: string;
  isWholesale: boolean;
  serviceCharge: number;
  finalDiscount: number;
  customerName: string;
  customerMobile: string;
  employee: string;
  customerId: string | null;
  customerPoints: number;
  lines: HeldBillLine[];
}

const store = recordStore<HeldBill>({
  collection: "held-bills",
  file: "held-bills.json",
});

export async function listHeldBills(): Promise<HeldBill[]> {
  return (await store.list()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function holdBill(
  input: Omit<HeldBill, "id" | "createdAt">,
): Promise<HeldBill> {
  const bill: HeldBill = {
    ...input,
    id: "HOLD-" + randomUUID().slice(0, 6).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  return store.put(bill);
}

export async function getHeldBill(id: string): Promise<HeldBill | null> {
  return store.get(id);
}

export async function removeHeldBill(id: string): Promise<boolean> {
  return store.remove(id);
}
