import { NextResponse } from "next/server";
import { exportProductsBuffer } from "@/lib/server/product-excel";

export const maxDuration = 60;

export async function GET() {
  try {
    const buffer = await exportProductsBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="grabber-products-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error ? error.message : "Could not export products",
      },
      { status: 500 },
    );
  }
}
