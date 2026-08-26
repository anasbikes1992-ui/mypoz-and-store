import "server-only";
import {
  websiteSchema,
  DEFAULT_WEBSITE,
  type WebsiteConfig,
} from "@/lib/website";
import { docStore } from "./persistence/doc-store";
import { readSettings, writeSettings } from "./settings-store";
import { readPublicStorefrontBundle } from "./storefront-public-docs";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  isSupabaseEnabled,
} from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";

/**
 * Tenant website / storefront CMS config.
 * Local: data/website.json — Durable: app_documents key = "website".
 */
const store = docStore<Partial<WebsiteConfig>>({
  key: "website",
  file: "website.json",
});

function anonClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Resolve website CMS for a public storefront by host/slug — does not depend on
 * middleware `x-mypoz-slug` (API routes historically omitted that header).
 */
export async function readWebsiteForStorefront(opts: {
  host?: string | null;
  slug?: string | null;
}): Promise<WebsiteConfig> {
  if (isSupabaseEnabled && (opts.slug || opts.host)) {
    try {
      const { data, error } = await anonClient().rpc("storefront_documents", {
        p_host: opts.host ?? "",
        p_slug: opts.slug ?? null,
      });
      if (!error && data && typeof data === "object") {
        const row = data as { website?: Record<string, unknown> };
        if (row.website && Object.keys(row.website).length > 0) {
          return websiteSchema.parse({
            ...DEFAULT_WEBSITE,
            ...row.website,
          });
        }
      }
    } catch {
      // fall through
    }
  }
  // Never require a staff session for public storefront CMS. Missing docs → defaults.
  try {
    return await readWebsite();
  } catch {
    return websiteSchema.parse({ ...DEFAULT_WEBSITE, enabled: true });
  }
}

/** Merge CMS doc with settings storefront fields so Settings stays a fallback. */
export async function readWebsite(): Promise<WebsiteConfig> {
  const publicBundle = await readPublicStorefrontBundle();
  if (publicBundle && Object.keys(publicBundle.website).length > 0) {
    try {
      return websiteSchema.parse({
        ...DEFAULT_WEBSITE,
        ...publicBundle.website,
      });
    } catch {
      return DEFAULT_WEBSITE;
    }
  }

  const settings = await readSettings();
  const raw = await store.read({});
  const seeded: Partial<WebsiteConfig> = {
    enabled: settings.storeEnabled !== "No",
    heroHeadline: settings.businessName || "",
    heroSubline: settings.storeSlogan || "",
    announcementBar: settings.storeSlogan || "",
    whatsappNumber: settings.socialWhatsapp || settings.phone || "",
    seoTitle: settings.businessName
      ? `${settings.businessName} — Online Store`
      : "",
    seoDescription: settings.storeSlogan || "",
    ogImageUrl: settings.storeBanner || "",
    banners: settings.storeBanner
      ? [
          {
            id: "settings-banner",
            imageUrl: settings.storeBanner,
            alt: settings.businessName || "Store banner",
          },
        ]
      : [],
  };

  try {
    return websiteSchema.parse({
      ...DEFAULT_WEBSITE,
      ...seeded,
      ...raw,
      // Explicit CMS values win; empty strings fall back to seeded.
      heroHeadline: raw.heroHeadline || seeded.heroHeadline || "",
      heroSubline: raw.heroSubline || seeded.heroSubline || "",
      announcementBar:
        raw.announcementBar !== undefined && raw.announcementBar !== ""
          ? raw.announcementBar
          : seeded.announcementBar || "",
      whatsappNumber: raw.whatsappNumber || seeded.whatsappNumber || "",
      seoTitle: raw.seoTitle || seeded.seoTitle || "",
      seoDescription: raw.seoDescription || seeded.seoDescription || "",
      ogImageUrl: raw.ogImageUrl || seeded.ogImageUrl || "",
      banners:
        raw.banners && raw.banners.length > 0
          ? raw.banners
          : seeded.banners || [],
      enabled:
        typeof raw.enabled === "boolean"
          ? raw.enabled
          : settings.storeEnabled !== "No",
    });
  } catch {
    return websiteSchema.parse({ ...DEFAULT_WEBSITE, ...seeded });
  }
}

export async function writeWebsite(input: unknown): Promise<WebsiteConfig> {
  const config = websiteSchema.parse(input);
  await store.write(config);

  // Keep Settings → storeEnabled in sync so older screens stay truthful.
  try {
    const settings = await readSettings();
    const nextEnabled = config.enabled ? "Yes" : "No";
    if (settings.storeEnabled !== nextEnabled) {
      await writeSettings({ ...settings, storeEnabled: nextEnabled });
    }
  } catch {
    // Non-fatal — CMS doc is the source of truth for the public shop.
  }

  return config;
}
