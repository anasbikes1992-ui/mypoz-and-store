import { NextRequest, NextResponse } from "next/server";
import { getRepository } from "@/lib/server/repositories";
import { productQuerySchema, productInputSchema } from "@/lib/validation";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { nextProductId } from "@/lib/server/product-repo";
import { upsertOverride } from "@/lib/server/product-write-store";
import type { Product } from "@/lib/types";

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
  if (isSupabaseEnabled) {
    return NextResponse.json(
      { success: false, data: null, error: "Manage products via Supabase in production mode" },
      { status: 400 },
    );
  }
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
      { success: false, data: null, error: parsed.error.issues[0]?.message ?? "Invalid product" },
      { status: 400 },
    );
  }
  const product: Product = {
    id: nextProductId(),
    stockDate: new Date().toISOString().slice(0, 10),
    ...parsed.data,
    nameLocal: parsed.data.nameLocal ?? null,
    brand: parsed.data.brand ?? null,
    wholesalePrice: parsed.data.wholesalePrice ?? null,
    expireDate: parsed.data.expireDate ?? null,
    supplier: parsed.data.supplier ?? null,
    imageUrl: parsed.data.imageUrl ?? null,
  };
  await upsertOverride(product);
  return NextResponse.json({ success: true, data: product, error: null });
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}
