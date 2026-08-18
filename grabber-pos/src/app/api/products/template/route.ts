import { NextResponse } from "next/server";
import { templateBuffer } from "@/lib/server/product-excel";

export function GET() {
  const buffer = templateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="grabber-product-template.xlsx"',
    },
  });
}
