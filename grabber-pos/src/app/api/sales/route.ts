import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { createSaleSchema } from "@/lib/validation";

export async function GET() {
  try {
    const repo = await getRepository();
    const sales = await repo.listSales(200);
    return NextResponse.json({ success: true, data: sales, error: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, data: null, error: messageOf(error) },
      { status: 500 },
    );
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
    // Business-rule failures (stock, discount, cash) are client-correctable.
    return NextResponse.json(
      { success: false, data: null, error: messageOf(error) },
      { status: 422 },
    );
  }
}

function badRequest(error: string) {
  return NextResponse.json(
    { success: false, data: null, error },
    { status: 400 },
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
