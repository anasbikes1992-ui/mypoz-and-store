import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listHeldBills,
  holdBill,
  getHeldBill,
  removeHeldBill,
} from "@/lib/server/held-bills-store";

const lineSchema = z.object({
  productId: z.string().min(1),
  name: z.string(),
  unitPrice: z.number(),
  wholesalePrice: z.number().nullable(),
  quantity: z.number().int().positive(),
  discount: z.number().min(0),
  maxDiscount: z.number().min(0),
  available: z.number(),
  serial: z.string().optional(),
  custom: z.boolean().optional(),
  modifiers: z.array(z.string()).optional(),
});

const holdSchema = z.object({
  label: z.string().max(80).optional(),
  isWholesale: z.boolean().default(false),
  serviceCharge: z.number().min(0).default(0),
  finalDiscount: z.number().min(0).default(0),
  customerName: z.string().default(""),
  customerMobile: z.string().default(""),
  employee: z.string().default(""),
  customerId: z.string().nullable().default(null),
  customerPoints: z.number().default(0),
  lines: z.array(lineSchema).min(1),
});

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const bill = await getHeldBill(id);
      if (!bill) {
        return NextResponse.json(
          { success: false, data: null, error: "Held bill not found" },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true, data: bill, error: null });
    }
    const bills = await listHeldBills();
    return NextResponse.json({ success: true, data: bills, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = holdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid held bill",
      },
      { status: 400 },
    );
  }

  try {
    const bill = await holdBill({
      ...parsed.data,
      label:
        parsed.data.label?.trim() ||
        parsed.data.customerName?.trim() ||
        `Hold ${new Date().toLocaleTimeString()}`,
    });
    return NextResponse.json({ success: true, data: bill, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Hold failed",
      },
      { status: 422 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, data: null, error: "id required" },
      { status: 400 },
    );
  }
  const ok = await removeHeldBill(id);
  return NextResponse.json({
    success: ok,
    data: null,
    error: ok ? null : "Not found",
  });
}
