import { NextResponse } from "next/server";
import { exportProductsBuffer } from "@/lib/server/product-excel";

export function GET() {
  const buffer = exportProductsBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="grabber-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
