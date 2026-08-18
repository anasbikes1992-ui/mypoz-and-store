import "server-only";
import {
  websiteSchema,
  DEFAULT_WEBSITE,
  type WebsiteConfig,
} from "@/lib/website";
import { docStore } from "./persistence/doc-store";
import { readSettings, writeSettings } from "./settings-store";

/**
 * Tenant website / storefront CMS config.
 * Local: data/website.json — Durable: app_documents key = "website".
 */
const store = docStore<Partial<WebsiteConfig>>({
  key: "website",
  file: "website.json",
});

/** Merge CMS doc with settings storefront fields so Settings stays a fallback. */
export async function readWebsite(): Promise<WebsiteConfig> {
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
