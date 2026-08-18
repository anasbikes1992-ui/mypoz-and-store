import { NextRequest, NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { parseProductsBuffer } from "@/lib/server/product-excel";
import { upsertMany } from "@/lib/server/product-write-store";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(req: NextRequest) {
  if (isSupabaseEnabled) {
    return NextResponse.json(
      { success: false, data: null, error: "Import via Supabase in production mode" },
      { status: 400 },
    );
  }

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
    await upsertMany(result.products);
    return NextResponse.json({
      success: true,
      data: {
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
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
            ? `Could not read file: ${error.message}`
            : "Could not read file",
      },
      { status: 422 },
    );
  }
}
