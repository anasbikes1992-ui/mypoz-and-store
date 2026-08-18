import { NextRequest, NextResponse } from "next/server";
import { putMedia } from "@/lib/server/media-store";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, data: null, error: "file is required" },
        { status: 400 },
      );
    }
    const data = await putMedia(file, "products");
    return NextResponse.json({ success: true, data: { url: data.url }, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 400 },
    );
  }
}
