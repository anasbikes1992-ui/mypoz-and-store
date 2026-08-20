import { NextRequest, NextResponse } from "next/server";
import { getEntity } from "@/lib/server/collection-store";
import { findById } from "@/lib/server/product-repo";
import { expandPackage, type PackageRecord } from "@/lib/packages";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const entity = await getEntity("packages", id);
  if (!entity) {
    return NextResponse.json(
      { success: false, data: null, error: "Package not found" },
      { status: 404 },
    );
  }

  try {
    const pack: PackageRecord = {
      name: String(entity.name ?? ""),
      price: Number(entity.price) || 0,
      productId: entity.productId ? String(entity.productId) : undefined,
      qty: entity.qty != null ? Number(entity.qty) : undefined,
      items: Array.isArray(entity.items)
        ? (entity.items as { productId: string; qty: number }[])
        : undefined,
    };
    const result = expandPackage(pack, (productId) => {
      const p = findById(productId);
      if (!p) return null;
      return { name: p.name, salePrice: p.salePrice };
    });
    return NextResponse.json({ success: true, data: result, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Expand failed",
      },
      { status: 422 },
    );
  }
}
