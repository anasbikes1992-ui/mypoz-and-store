import type { Product } from "@/lib/types";
import { expiryStatus } from "@/lib/format";
import { daysUntilDue, isJobOverdue } from "@/lib/job-math";
import { hpNextDueAt, hpOverdueDays } from "@/lib/hp-math";

export interface StockAlertItem {
  id: string;
  name: string;
  quantity: number;
  expireDate: string | null;
}

export interface OpsAlertItem {
  id: string;
  kind: "hp-overdue" | "job-overdue";
  title: string;
  detail: string;
  severity: "warn" | "danger";
}

export interface AlertsPayload {
  lowStock: StockAlertItem[];
  expiring: StockAlertItem[];
  expired: StockAlertItem[];
  operational: OpsAlertItem[];
  counts: {
    lowStock: number;
    expiring: number;
    expired: number;
    operational: number;
  };
}

export function buildProductAlerts(products: Product[]): Pick<
  AlertsPayload,
  "lowStock" | "expiring" | "expired" | "counts"
> {
  const lowStock: StockAlertItem[] = [];
  const expiring: StockAlertItem[] = [];
  const expired: StockAlertItem[] = [];

  for (const p of products) {
    const row: StockAlertItem = {
      id: p.id,
      name: p.name,
      quantity: p.quantity,
      expireDate: p.expireDate,
    };
    if (p.quantity <= 5) lowStock.push(row);
    const exp = expiryStatus(p.expireDate);
    if (exp === "expired") expired.push(row);
    else if (exp === "expiring") expiring.push(row);
  }

  lowStock.sort((a, b) => a.quantity - b.quantity);

  return {
    lowStock,
    expiring,
    expired,
    counts: {
      lowStock: lowStock.length,
      expiring: expiring.length,
      expired: expired.length,
      operational: 0,
    },
  };
}

export function buildHpAlerts(
  agreements: Array<{
    id: string;
    customer: string;
    item: string;
    status: "active" | "completed";
    payments: { date: string }[];
    balance: number;
    createdAt: string;
  }>,
  dueDayOfMonth: number,
): OpsAlertItem[] {
  const out: OpsAlertItem[] = [];
  for (const a of agreements) {
    const nextDueAt = hpNextDueAt(a, dueDayOfMonth);
    const overdue = hpOverdueDays(nextDueAt);
    if (overdue <= 0) continue;
    out.push({
      id: a.id,
      kind: "hp-overdue",
      title: `${a.customer} · ${a.item}`,
      detail: `${overdue} day(s) overdue on HP ${a.id}`,
      severity: overdue >= 7 ? "danger" : "warn",
    });
  }
  return out;
}

export function buildJobAlerts(
  jobs: Array<{
    id: string;
    customer: string;
    subject: string;
    status: string;
    dueAt?: string | null;
  }>,
): OpsAlertItem[] {
  const out: OpsAlertItem[] = [];
  for (const j of jobs) {
    if (!isJobOverdue(j.dueAt, j.status)) continue;
    const days = daysUntilDue(j.dueAt);
    const late = days != null ? Math.abs(days) : 0;
    out.push({
      id: j.id,
      kind: "job-overdue",
      title: `${j.customer || j.id} · ${j.subject || "Job"}`,
      detail: `${late} day(s) past SLA on ${j.id}`,
      severity: late >= 3 ? "danger" : "warn",
    });
  }
  return out;
}
