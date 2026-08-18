import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";

/** Hire-purchase agreements: a total paid off over installments. */
export interface HPPayment {
  id: string;
  amount: number;
  date: string;
}
export interface HPAgreement {
  id: string;
  customer: string;
  phone: string;
  item: string;
  total: number;
  downPayment: number;
  installments: number;
  payments: HPPayment[];
  status: "active" | "completed";
  createdAt: string;
}

const store = recordStore<HPAgreement>({
  collection: "hire-purchase",
  file: "hire-purchase.json",
});

export function hpBalance(a: HPAgreement) {
  const paid = a.downPayment + a.payments.reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, a.total - paid);
  const installmentAmount =
    a.installments > 0 ? Math.ceil((a.total - a.downPayment) / a.installments) : 0;
  return { paid, balance, installmentAmount };
}

export async function listAgreements(): Promise<HPAgreement[]> {
  return (await store.list()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getAgreement(id: string): Promise<HPAgreement | null> {
  return store.get(id);
}

export async function createAgreement(input: {
  customer: string;
  phone?: string;
  item: string;
  total: number;
  downPayment?: number;
  installments: number;
}): Promise<HPAgreement> {
  const agreement: HPAgreement = {
    id: "HP-" + randomUUID().slice(0, 8),
    customer: input.customer.trim(),
    phone: input.phone?.trim() ?? "",
    item: input.item.trim(),
    total: Number(input.total) || 0,
    downPayment: Math.max(0, Number(input.downPayment) || 0),
    installments: Math.max(1, Math.floor(Number(input.installments) || 1)),
    payments: [],
    status: "active",
    createdAt: new Date().toISOString(),
  };
  return store.put(agreement);
}

export async function addPayment(
  id: string,
  amount: number,
): Promise<HPAgreement | null> {
  const current = await store.get(id);
  if (!current) return null;
  const payment: HPPayment = {
    id: "P-" + randomUUID().slice(0, 6),
    amount: Math.max(0, Number(amount) || 0),
    date: new Date().toISOString(),
  };
  const payments = [...current.payments, payment];
  const paid = current.downPayment + payments.reduce((s, p) => s + p.amount, 0);
  const next: HPAgreement = {
    ...current,
    payments,
    status: paid >= current.total ? "completed" : "active",
  };
  return store.put(next);
}
