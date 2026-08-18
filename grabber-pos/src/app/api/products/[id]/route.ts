import { NextRequest, NextResponse } from "next/server";
import { productInputSchema } from "@/lib/validation";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { findById } from "@/lib/server/product-repo";
import {
  upsertOverride,
  deleteOverride,
} from "@/lib/server/product-write-store";
import type { Product } from "@/lib/types";

function guard() {
  if (isSupabaseEnabled) {
    return NextResponse.json(
      { success: false, data: null, error: "Manage products via Supabase in production mode" },
      { status: 400 },
    );
  }
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guard();
  if (blocked) return blocked;

  const { id } = await params;
  const existing = findById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, data: null, error: "Product not found" },
      { status: 404 },
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
    ...existing,
    ...parsed.data,
    id,
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const blocked = guard();
  if (blocked) return blocked;

  const { id } = await params;
  if (!findById(id)) {
    return NextResponse.json(
      { success: false, data: null, error: "Product not found" },
      { status: 404 },
    );
  }
  await deleteOverride(id);
  return NextResponse.json({ success: true, data: null, error: null });
}
