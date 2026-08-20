import { NextRequest, NextResponse } from "next/server";
import { parseProductsBuffer } from "@/lib/server/product-excel";
import { importProductsAdmin } from "@/lib/server/product-admin-store";

export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Expected a multipart file upload" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { success: false, data: null, error: "No file provided" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, data: null, error: "File too large (max 15 MB)" },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = parseProductsBuffer(buffer);
    if (result.products.length === 0) {
      return NextResponse.json(
        {
          success: false,
          data: result,
          error:
            "No valid rows found. Check that the sheet has a Name column and data.",
        },
        { status: 422 },
      );
    }

    const summary = await importProductsAdmin(result.products);
    return NextResponse.json({
      success: true,
      data: {
        imported: summary.imported,
        updated: summary.updated,
        skipped: result.skipped + summary.skipped,
        errors: [...result.errors, ...summary.errors].slice(0, 10),
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          error instanceof Error
            ? `Could not import file: ${error.message}`
            : "Could not read file",
      },
      { status: 422 },
    );
  }
}
