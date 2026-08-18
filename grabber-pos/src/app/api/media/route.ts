import { NextRequest, NextResponse } from "next/server";
import { deleteMedia, listMedia, putMedia } from "@/lib/server/media-store";

export async function GET() {
  const items = await listMedia();
  return NextResponse.json({ success: true, data: items, error: null });
}

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
    const data = await putMedia(file, "library");
    return NextResponse.json({ success: true, data, error: null });
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

export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  const ok = await deleteMedia(url);
  if (!ok) {
    return NextResponse.json(
      { success: false, data: null, error: "Could not delete that file" },
      { status: 400 },
    );
  }
  return NextResponse.json({ success: true, data: { url }, error: null });
}
