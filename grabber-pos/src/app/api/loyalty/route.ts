import { NextRequest, NextResponse } from "next/server";
import { getEntity, updateEntity } from "@/lib/server/collection-store";
import {
  appendEntry,
  listByCustomer,
  listRecent,
} from "@/lib/server/loyalty-ledger";

/**
 * GET ?customerId= — balance + ledger for one customer.
 * GET (no id) — recent ledger entries across customers.
 *
 * POST — adjust points: { customerId, earn?, redeem?, adjust?, note?, saleId? }
 * Points move by (earn - redeem + adjust), floored at zero. Ledger rows written.
 */
export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId");
  if (!customerId) {
    const entries = await listRecent(40);
    return NextResponse.json({
      success: true,
      data: { entries },
      error: null,
    });
  }

  const customer = await getEntity("customers", customerId);
  if (!customer) {
    return NextResponse.json(
      { success: false, data: null, error: "Customer not found" },
      { status: 404 },
    );
  }

  const points = Number(customer.points) || 0;
  const entries = await listByCustomer(customerId);
  return NextResponse.json({
    success: true,
    data: { points, entries },
    error: null,
  });
}

export async function POST(req: NextRequest) {
  let body: {
    customerId?: string;
    earn?: number;
    redeem?: number;
    adjust?: number;
    note?: string;
    saleId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { customerId } = body;
  const earn = Math.max(0, Math.floor(Number(body.earn) || 0));
  const redeem = Math.max(0, Math.floor(Number(body.redeem) || 0));
  const adjust = Math.trunc(Number(body.adjust) || 0);
  if (!customerId) {
    return NextResponse.json(
      { success: false, data: null, error: "customerId is required" },
      { status: 400 },
    );
  }

  const customer = await getEntity("customers", customerId);
  if (!customer) {
    return NextResponse.json(
      { success: false, data: null, error: "Customer not found" },
      { status: 404 },
    );
  }

  const current = Number(customer.points) || 0;
  const points = Math.max(0, current - redeem + earn + adjust);
  await updateEntity("customers", customerId, { points });

  const note = body.note?.trim() || "";
  const saleId = body.saleId;

  if (earn > 0) {
    await appendEntry({
      customerId,
      kind: "earn",
      points: earn,
      note: note || "Points earned",
      saleId,
    });
  }
  if (redeem > 0) {
    await appendEntry({
      customerId,
      kind: "redeem",
      points: redeem,
      note: note || "Points redeemed",
      saleId,
    });
  }
  if (adjust !== 0) {
    await appendEntry({
      customerId,
      kind: "adjust",
      points: adjust,
      note: note || "Manual adjustment",
      saleId,
    });
  }

  return NextResponse.json({
    success: true,
    data: { points, earned: earn, redeemed: redeem, adjusted: adjust },
    error: null,
  });
}
