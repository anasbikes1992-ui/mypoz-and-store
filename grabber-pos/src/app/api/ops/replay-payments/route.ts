import { NextResponse } from "next/server";
import { requireTenantSession, requireRoles } from "@/lib/server/auth-session";
import { replayUnprocessedPaymentEvents } from "@/lib/server/payment-events-replay";

/** Owner-only replay of unprocessed payment_events (Phase F DLQ). */
export async function POST(req: Request) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const roleCheck = requireRoles(auth.session, ["owner"]);
  if (roleCheck) return roleCheck;

  let limit = 50;
  try {
    const body = await req.json();
    if (typeof body?.limit === "number") limit = Math.min(100, Math.max(1, body.limit));
  } catch {
    /* default limit */
  }

  const result = await replayUnprocessedPaymentEvents(limit);
  return NextResponse.json({ success: true, data: result, error: null });
}
