import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { productQuerySchema, productInputSchema } from "@/lib/validation";
import { createProductAdmin } from "@/lib/server/product-admin-store";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const repo = await getRepository();

  const barcode = params.get("barcode");
  if (barcode) {
    const product = await repo.findByBarcode(barcode);
    return NextResponse.json({
      success: !!product,
      data: product,
      error: product ? null : "No product with that barcode",
    });
  }

  const parsed = productQuerySchema.safeParse({
    search: params.get("search") ?? undefined,
    category: params.get("category") ?? undefined,
    page: params.get("page") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  try {
    const result = await repo.queryProducts(parsed.data);
    return NextResponse.json({ success: true, data: result, error: null });
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
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid product",
      },
      { status: 400 },
    );
  }

  try {
    const product = await createProductAdmin(parsed.data);
    return NextResponse.json({ success: true, data: product, error: null });
  } catch (error) {
    const msg = messageOf(error);
    const status = /sign in|unauthorized/i.test(msg) ? 401 : 500;
    return NextResponse.json(
      { success: false, data: null, error: msg },
      { status },
    );
  }
}
