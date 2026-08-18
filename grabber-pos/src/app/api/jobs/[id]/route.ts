import { NextRequest, NextResponse } from "next/server";
import {
  getJob,
  updateMeta,
  addPart,
  setPartQty,
  addLabour,
  removeLabour,
  removeJob,
  jobTotals,
} from "@/lib/server/job-store";
import { createSale } from "@/lib/server/sales-repo";
import type { JobStatus } from "@/lib/server/job-store";
import type { SaleLine } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJob(id);
  return NextResponse.json({ success: true, data: job, error: null });
}

interface Body {
  action:
    | "meta"
    | "addPart"
    | "setPartQty"
    | "addLabour"
    | "removeLabour"
    | "settle";
  meta?: Record<string, string>;
  productId?: string;
  quantity?: number;
  description?: string;
  amount?: number;
  labourId?: string;
  paymentMethod?: "cash" | "card" | "wholesale";
  cashReceived?: number;
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, data: null, error }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  try {
    switch (body.action) {
      case "meta":
        return ok(
          await updateMeta(id, (body.meta ?? {}) as { status?: JobStatus }),
        );
      case "addPart":
        if (!body.productId) return fail("productId is required");
        return ok(await addPart(id, body.productId));
      case "setPartQty":
        if (!body.productId) return fail("productId is required");
        return ok(await setPartQty(id, body.productId, body.quantity ?? 0));
      case "addLabour":
        if (!body.description) return fail("description is required");
        return ok(
          await addLabour(id, body.description, Number(body.amount) || 0),
        );
      case "removeLabour":
        if (!body.labourId) return fail("labourId is required");
        return ok(await removeLabour(id, body.labourId));
      case "settle": {
        const job = await getJob(id);
        if (!job) return fail("Job not found", 404);
        const totals = jobTotals(job);
        if (totals.total <= 0) return fail("Nothing to bill");

        const lines: SaleLine[] = [
          ...job.parts.map((p) => ({
            productId: p.productId,
            name: p.name,
            unitPrice: p.unitPrice,
            quantity: p.quantity,
            discount: 0,
            lineTotal: p.unitPrice * p.quantity,
          })),
          ...job.labour.map((l) => ({
            productId: "",
            name: `Labour: ${l.description}`,
            unitPrice: l.amount,
            quantity: 1,
            discount: 0,
            lineTotal: l.amount,
          })),
        ];
        const method = body.paymentMethod ?? "cash";
        const cash =
          method === "cash" ? (Number(body.cashReceived) || totals.total) : null;

        const sale = await createSale({
          lines,
          subtotal: totals.total,
          discountTotal: 0,
          finalDiscount: 0,
          serviceCharge: 0,
          total: totals.total,
          paymentMethod: method,
          isWholesale: false,
          customerName: job.customer || null,
          customerMobile: job.phone || null,
          employee: null,
          cashReceived: cash,
          change: cash != null ? cash - totals.total : null,
        });
        await removeJob(id);
        return NextResponse.json({ success: true, data: sale, error: null });
      }
      default:
        return fail("Unknown action");
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Failed", 422);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await removeJob(id);
  return NextResponse.json({ success: true, data: null, error: null });
}

function ok(data: unknown) {
  return NextResponse.json({ success: true, data, error: null });
}
