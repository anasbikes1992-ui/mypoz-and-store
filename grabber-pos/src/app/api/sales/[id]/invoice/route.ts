import { NextRequest, NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/server/auth-session";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "@/lib/server/settings-store";
import { buildInvoicePdf } from "@/lib/server/invoice-pdf";
import { businessErrorResponse } from "@/lib/server/business-errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const repo = await getRepository();
    const sale = await repo.findSaleById(id);
    if (!sale) {
      return NextResponse.json(
        { success: false, data: null, error: "Sale not found" },
        { status: 404 },
      );
    }
    const settings = await readSettings();
    const pdf = await buildInvoicePdf(sale, settings);
    const label = sale.receiptNo || sale.id;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${label}.pdf"`,
      },
    });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
