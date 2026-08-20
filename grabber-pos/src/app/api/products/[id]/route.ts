import { NextRequest, NextResponse } from "next/server";
import { productInputSchema } from "@/lib/validation";
import {
  updateProductAdmin,
  deleteProductAdmin,
} from "@/lib/server/product-admin-store";

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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
    const product = await updateProductAdmin(id, parsed.data);
    return NextResponse.json({ success: true, data: product, error: null });
  } catch (error) {
    const msg = messageOf(error);
    const status = /not found/i.test(msg)
      ? 404
      : /sign in|unauthorized/i.test(msg)
        ? 401
        : 500;
    return NextResponse.json(
      { success: false, data: null, error: msg },
      { status },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteProductAdmin(id);
    return NextResponse.json({ success: true, data: null, error: null });
  } catch (error) {
    const msg = messageOf(error);
    const status = /not found/i.test(msg)
      ? 404
      : /sign in|unauthorized/i.test(msg)
        ? 401
        : 500;
    return NextResponse.json(
      { success: false, data: null, error: msg },
      { status },
    );
  }
}
