import { NextRequest, NextResponse } from "next/server";
import { addPayment, hpBalance, getAgreement } from "@/lib/server/hp-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    return NextResponse.json(
      { success: false, data: null, error: "Amount must be positive" },
      { status: 400 },
    );
  }
  const agreement = await addPayment(id, amount);
  if (!agreement) {
    return NextResponse.json(
      { success: false, data: null, error: "Agreement not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    success: true,
    data: { ...agreement, ...hpBalance(agreement) },
    error: null,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agreement = await getAgreement(id);
  return NextResponse.json({
    success: true,
    data: agreement ? { ...agreement, ...hpBalance(agreement) } : null,
    error: null,
  });
}
