import type { Booking } from "./booking-types";

/** Inclusive date overlap for YYYY-MM-DD ranges. */
export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && bStart <= aEnd;
}

/** Days past endDate (0 if not late). */
export function daysOverdue(
  b: Pick<Booking, "endDate">,
  today = new Date(),
): number {
  if (!b.endDate) return 0;
  const todayStr = today.toISOString().slice(0, 10);
  if (b.endDate >= todayStr) return 0;
  const end = new Date(b.endDate + "T00:00:00");
  const startOfToday = new Date(todayStr + "T00:00:00");
  return Math.max(
    1,
    Math.round((startOfToday.getTime() - end.getTime()) / 86_400_000),
  );
}

/** Suggested overdue: days late × rate × 0.1. */
export function suggestedOverdueFee(
  b: Pick<Booking, "endDate" | "rate">,
  today = new Date(),
): number {
  const days = daysOverdue(b, today);
  if (days <= 0) return 0;
  return Math.round(days * (Number(b.rate) || 0) * 0.1);
}

export function bookingTotals(b: Booking) {
  let duration = 0;
  if (b.startDate && b.endDate) {
    const days = Math.round(
      (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
        86_400_000,
    );
    duration = Math.max(1, days);
  }
  const stayCharge = duration * (Number(b.rate) || 0);
  const extras = b.extras.reduce((s, e) => s + e.amount, 0);
  const overdue = Math.max(0, Number(b.overdueFee) || 0);
  const forfeit =
    b.depositDisposition === "forfeited"
      ? Math.max(0, Number(b.deposit) || 0)
      : 0;
  return {
    duration,
    stayCharge,
    extras,
    overdue,
    forfeit,
    total: stayCharge + extras + overdue + forfeit,
  };
}
