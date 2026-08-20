/** Membership discount helpers for POS and CRM. */

export type MembershipRecord = {
  id?: string;
  name?: string;
  customerId?: string;
  planName?: string;
  price?: number;
  periodDays?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  memberPricePercent?: number;
};

function isWithinWindow(m: MembershipRecord, now: Date): boolean {
  if (m.startDate) {
    const start = new Date(m.startDate);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now.getTime()) {
      return false;
    }
  }
  if (m.endDate) {
    const end = new Date(m.endDate);
    // Treat end date as inclusive through end of that calendar day.
    if (!Number.isNaN(end.getTime())) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (endOfDay.getTime() < now.getTime()) return false;
    }
  }
  return true;
}

/**
 * Returns the best active membership discount % for a customer, or null.
 * Pure — pass the memberships list from `/api/collections/memberships`.
 */
export function activeMemberDiscount(
  memberships: MembershipRecord[],
  customerId: string,
  now = new Date(),
): number | null {
  if (!customerId) return null;
  let best: number | null = null;
  for (const m of memberships) {
    if (String(m.customerId ?? "") !== customerId) continue;
    const status = (m.status || "active").toLowerCase();
    if (status !== "active") continue;
    if (!isWithinWindow(m, now)) continue;
    const pct = Math.min(100, Math.max(0, Number(m.memberPricePercent) || 0));
    if (pct <= 0) continue;
    if (best === null || pct > best) best = pct;
  }
  return best;
}
