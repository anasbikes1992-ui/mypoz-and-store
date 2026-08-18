import "server-only";
import {
  DEFAULT_HQ_PLATFORM,
  hqPlatformSchema,
  type HqPlatformConfig,
} from "@/lib/hq-config";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import { dataFile, readJsonFile, writeJsonFile } from "@/lib/server/persistence/local-json";

export type { HqPlatformConfig };
export { hqPlatformSchema, DEFAULT_HQ_PLATFORM };

const FILE = dataFile("hq-platform.json");
const ROW_KEY = "platform";

async function fromTable(): Promise<HqPlatformConfig | null> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const db = createServiceSupabase();
    const { data, error } = await db
      .from("platform_settings")
      .select("data")
      .eq("key", ROW_KEY)
      .maybeSingle();
    if (error) return null;
    if (!data?.data) return DEFAULT_HQ_PLATFORM;
    return hqPlatformSchema.parse(data.data);
  } catch {
    return null;
  }
}

async function toTable(value: HqPlatformConfig): Promise<boolean> {
  if (!isSupabaseEnabled || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const db = createServiceSupabase();
    const { error } = await db.from("platform_settings").upsert({
      key: ROW_KEY,
      data: value as unknown as import("@/lib/supabase/database.types").Json,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function readHqPlatform(): Promise<HqPlatformConfig> {
  const remote = await fromTable();
  if (remote) return remote;
  const local = await readJsonFile<HqPlatformConfig>(FILE, DEFAULT_HQ_PLATFORM);
  return hqPlatformSchema.parse(local);
}

export async function writeHqPlatform(input: unknown): Promise<HqPlatformConfig> {
  const current = await readHqPlatform();
  const next = hqPlatformSchema.parse({ ...current, ...(input as object) });
  const saved = await toTable(next);
  if (!saved) await writeJsonFile(FILE, next);
  return next;
}
