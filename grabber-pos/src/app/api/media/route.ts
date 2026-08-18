import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
const ROOT = path.join(process.cwd(), "public", "uploads");

async function listRecursive(dir: string, prefix: string): Promise<{ url: string; name: string }[]> {
  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: { url: string; name: string }[] = [];
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    const rel = `${prefix}/${e.name}`;
    if (e.isDirectory()) {
      out.push(...(await listRecursive(full, rel)));
    } else {
      out.push({ url: `/uploads${rel}`, name: e.name });
    }
  }
  return out;
}

export async function GET() {
  const items = await listRecursive(ROOT, "");
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
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { success: false, data: null, error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, data: null, error: "Image must be under 5 MB" },
        { status: 400 },
      );
    }
    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const dir = path.join(ROOT, "library");
    await mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    const url = `/uploads/library/${filename}`;
    return NextResponse.json({ success: true, data: { url, name: filename }, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Upload failed",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || "";
  if (!url.startsWith("/uploads/") || url.includes("..")) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid media path" },
      { status: 400 },
    );
  }
  const rel = url.replace(/^\/uploads\//, "").split("/").filter(Boolean);
  const filePath = path.resolve(ROOT, ...rel);
  const root = path.resolve(ROOT);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid media path" },
      { status: 400 },
    );
  }
  try {
    await unlink(filePath);
    return NextResponse.json({ success: true, data: { url }, error: null });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "File not found" },
      { status: 404 },
    );
  }
}
