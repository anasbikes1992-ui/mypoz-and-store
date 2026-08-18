import "server-only";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isSupabaseEnabled, SUPABASE_URL } from "@/lib/supabase/config";
import { createServerSupabase } from "@/lib/supabase/server";

export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ROOT = path.join(process.cwd(), "public", "uploads");
const BUCKET = "media";

export type MediaItem = { url: string; name: string; backend: "supabase" | "local" };

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

async function orgId(): Promise<string | null> {
  if (!isSupabaseEnabled) return null;
  try {
    const db = await createServerSupabase();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return null;
    const { data } = await db
      .from("profiles")
      .select("org_id")
      .eq("id", auth.user.id)
      .maybeSingle();
    return data?.org_id ?? null;
  } catch {
    return null;
  }
}

async function listLocal(): Promise<MediaItem[]> {
  async function walk(dir: string, prefix: string): Promise<MediaItem[]> {
    let entries: { name: string; isDirectory: () => boolean }[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const out: MediaItem[] = [];
    for (const e of entries) {
      if (e.name.startsWith(".")) continue;
      const full = path.join(dir, e.name);
      const rel = `${prefix}/${e.name}`;
      if (e.isDirectory()) out.push(...(await walk(full, rel)));
      else out.push({ url: `/uploads${rel}`, name: e.name, backend: "local" });
    }
    return out;
  }
  return walk(ROOT, "");
}

export async function listMedia(): Promise<MediaItem[]> {
  const local = await listLocal();
  const org = await orgId();
  if (!org || !isSupabaseEnabled) return local;
  try {
    const db = await createServerSupabase();
    const { data, error } = await db.storage.from(BUCKET).list(org, { limit: 200 });
    if (error || !data) return local;
    const remote: MediaItem[] = data
      .filter((f) => f.name && !f.name.endsWith("/"))
      .map((f) => ({
        name: f.name,
        url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${org}/${f.name}`,
        backend: "supabase",
      }));
    const urls = new Set(remote.map((r) => r.url));
    return [...remote, ...local.filter((l) => !urls.has(l.url))];
  } catch {
    return local;
  }
}

export async function putMedia(file: File, folder = "library"): Promise<MediaItem> {
  if (!MEDIA_TYPES.has(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
  }
  if (file.size > MEDIA_MAX_BYTES) {
    throw new Error("Image must be under 5 MB");
  }
  const ext = extFor(file.type);
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const org = await orgId();

  if (org && isSupabaseEnabled) {
    try {
      const db = await createServerSupabase();
      const objectPath = `${org}/${folder}/${filename}`;
      const { error } = await db.storage.from(BUCKET).upload(objectPath, buf, {
        contentType: file.type,
        upsert: false,
      });
      if (!error) {
        return {
          name: filename,
          url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`,
          backend: "supabase",
        };
      }
    } catch {
      // fall through to local disk
    }
  }

  const dir = path.join(ROOT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);
  return { name: filename, url: `/uploads/${folder}/${filename}`, backend: "local" };
}

export async function deleteMedia(url: string): Promise<boolean> {
  if (url.includes("..")) return false;
  const org = await orgId();
  if (org && isSupabaseEnabled && url.includes(`/object/public/${BUCKET}/`)) {
    const marker = `/object/public/${BUCKET}/`;
    const objectPath = url.slice(url.indexOf(marker) + marker.length);
    if (!objectPath.startsWith(`${org}/`)) return false;
    const db = await createServerSupabase();
    const { error } = await db.storage.from(BUCKET).remove([objectPath]);
    return !error;
  }
  if (!url.startsWith("/uploads/")) return false;
  const rel = url.replace(/^\/uploads\//, "").split("/").filter(Boolean);
  const filePath = path.resolve(ROOT, ...rel);
  const root = path.resolve(ROOT);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) return false;
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
