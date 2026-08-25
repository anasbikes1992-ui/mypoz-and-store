import { NextResponse } from "next/server";
import { templateBuffer } from "@/lib/server/product-excel";
import { requireTenantSession } from "@/lib/server/auth-session";

export async function GET() {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;
  const buffer = templateBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="grabber-product-template.xlsx"',
    },
  });
}
