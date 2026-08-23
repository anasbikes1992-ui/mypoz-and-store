/** Hire-purchase schedule helpers — no server imports. */

export interface HpScheduleInput {
  createdAt: string;
  status: "active" | "completed";
  payments: { date: string }[];
  balance: number;
}

export function clampDueDay(day: number): number {
  return Math.min(28, Math.max(1, Math.floor(day) || 1));
}

/** Next installment due date from agreement start + payments made. */
export function hpNextDueAt(
  input: HpScheduleInput,
  dueDayOfMonth = 1,
): string | null {
  if (input.status === "completed" || input.balance <= 0) return null;

  const day = clampDueDay(dueDayOfMonth);
  const start = new Date(input.createdAt);
  if (Number.isNaN(start.getTime())) return null;

  const installmentIndex = input.payments.length + 1;
  const due = new Date(start);
  due.setMonth(due.getMonth() + installmentIndex);
  due.setDate(day);
  due.setHours(23, 59, 59, 999);
  return due.toISOString();
}

export function hpOverdueDays(
  nextDueAt: string | null | undefined,
  now = Date.now(),
): number {
  if (!nextDueAt) return 0;
  const t = new Date(nextDueAt).getTime();
  if (Number.isNaN(t) || now <= t) return 0;
  return Math.floor((now - t) / 86_400_000);
}

export function parseCsvList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
