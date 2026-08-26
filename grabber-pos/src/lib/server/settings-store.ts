import "server-only";
import { headers } from "next/headers";
import { settingsSchema, DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { docStore } from "./persistence/doc-store";
import { readPublicStorefrontBundle } from "./storefront-public-docs";

/**
 * Single-record business settings. Local backend: data/settings.json.
 * Durable backend: app_documents where key = 'settings' (RLS per organization).
 */
const store = docStore<Partial<Settings>>({ key: "settings", file: "settings.json" });

async function isPublicStorefrontRequest(): Promise<boolean> {
  try {
    const h = await headers();
    return Boolean(h.get("x-mypoz-slug") || h.get("x-mypoz-host"));
  } catch {
    return false;
  }
}

export async function readSettings(): Promise<Settings> {
  const publicBundle = await readPublicStorefrontBundle();
  if (publicBundle && Object.keys(publicBundle.settings).length > 0) {
    try {
      return settingsSchema.parse({ ...DEFAULT_SETTINGS, ...publicBundle.settings });
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  // Anonymous /store/{slug} must not hit session doc stores (Unauthorized → 500).
  if (await isPublicStorefrontRequest()) {
    return DEFAULT_SETTINGS;
  }

  const raw = await store.read(DEFAULT_SETTINGS);
  try {
    return settingsSchema.parse({ ...DEFAULT_SETTINGS, ...raw });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function writeSettings(input: unknown): Promise<Settings> {
  const settings = settingsSchema.parse(input);
  await store.write(settings);
  return settings;
}
