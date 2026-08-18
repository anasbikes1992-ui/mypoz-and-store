import { NextRequest, NextResponse } from "next/server";
import { findSaleById } from "@/lib/server/sales-repo";
import { readSettings } from "@/lib/server/settings-store";
import { buildInvoicePdf } from "@/lib/server/invoice-pdf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sale = await findSaleById(id);
  if (!sale) {
    return NextResponse.json(
      { success: false, data: null, error: "Sale not found" },
      { status: 404 },
    );
  }
  const settings = await readSettings();
  const pdf = await buildInvoicePdf(sale, settings);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${sale.id}.pdf"`,
    },
  });
}
