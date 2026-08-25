import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { createSaleSchema } from "@/lib/validation";
import { businessErrorResponse } from "@/lib/server/business-errors";

export async function GET() {
  try {
    const repo = await getRepository();
    const sales = await repo.listSales(200);
    return NextResponse.json({ success: true, data: sales, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? "Invalid sale");
  }

  try {
    const repo = await getRepository();
    const sale = await repo.createSale(parsed.data);
    return NextResponse.json({ success: true, data: sale, error: null });
  } catch (error) {
    return businessErrorResponse(error);
  }
}

function badRequest(error: string) {
  return NextResponse.json(
    { success: false, data: null, error, code: "INVALID" },
    { status: 400 },
  );
}
