import "server-only";
import { docStore } from "./persistence/doc-store";
import { readWebsite, writeWebsite } from "./website-store";
import { readSettings } from "./settings-store";
import {
  commerceDocumentSchema,
  canonicalThemeId,
  storeConfigSchema,
  type CommerceDocument,
  type StoreConfig,
} from "@/lib/commerce/schema";
import { defaultStoreConfig } from "@/lib/commerce/defaults";
import type { ThemePreset } from "@/lib/website";

const store = docStore<Partial<CommerceDocument>>({
  key: "commerce",
  file: "commerce.json",
});

function emptyDoc(seed: StoreConfig): CommerceDocument {
  return commerceDocumentSchema.parse({
    draft: seed,
    published: null,
    publishedAt: null,
    updatedAt: new Date().toISOString(),
  });
}

function themeToWebsite(id: StoreConfig["themeId"]): ThemePreset {
  if (id === "minimal") return "minimal";
  if (id === "local") return "local";
  if (id === "fashion" || id === "luxury") return "bold";
  if (id === "market" || id === "food") return "classic";
  return "local";
}

async function seedFromExisting(): Promise<StoreConfig> {
  const [website, settings] = await Promise.all([readWebsite(), readSettings()]);
  return defaultStoreConfig({
    name: settings.businessName || "MyPoz Store",
    slug: settings.storeSlug || "main-store",
    description: settings.storeSlogan || "",
    themeId: canonicalThemeId(website.theme),
    announcement: website.announcementBar || settings.storeSlogan || "",
    seoTitle: website.seoTitle || "",
    seoDescription: website.seoDescription || "",
    contactEmail: settings.email || "",
    contactPhone: website.whatsappNumber || settings.phone || "",
    address: settings.address || "",
    social: {
      facebook: website.socialFacebook || "",
      instagram: website.socialInstagram || "",
      twitter: website.socialTwitter || "",
      tiktok: website.socialTiktok || "",
      whatsapp: website.whatsappNumber || settings.socialWhatsapp || "",
    },
    tokens: {
      primary: "",
      secondary: "",
      headingFont: "",
      bodyFont: "",
      radius: "soft",
      cardStyle: "classic",
      imageRatio: "4:5",
      logoUrl: "",
      faviconUrl: "",
    },
  });
}

async function readRaw(): Promise<CommerceDocument> {
  const seed = await seedFromExisting();
  const raw = await store.read({});
  try {
    return commerceDocumentSchema.parse({
      draft: raw.draft ? storeConfigSchema.parse({ ...seed, ...raw.draft }) : seed,
      published: raw.published
        ? storeConfigSchema.parse({ ...seed, ...raw.published })
        : null,
      publishedAt: raw.publishedAt ?? null,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    });
  } catch {
    return emptyDoc(seed);
  }
}

export async function readCommerce(): Promise<CommerceDocument> {
  return readRaw();
}

export async function readDraftStore(): Promise<StoreConfig> {
  const doc = await readRaw();
  return doc.draft;
}

/** Public visitors always get published config, never draft. */
export async function readPublishedStore(): Promise<StoreConfig> {
  const doc = await readRaw();
  if (doc.published && doc.published.status === "published") {
    return doc.published;
  }
  const website = await readWebsite();
  const draft = doc.draft;
  if (!website.enabled) {
    return { ...draft, status: "draft" };
  }
  return { ...draft, status: website.enabled ? "published" : "draft" };
}

export async function writeDraftStore(input: unknown): Promise<StoreConfig> {
  const current = await readRaw();
  const draft = storeConfigSchema.parse({ ...current.draft, ...(input as object) });
  const next: CommerceDocument = {
    ...current,
    draft,
    updatedAt: new Date().toISOString(),
  };
  await store.write(next);
  return draft;
}

/**
 * Atomic publish: draft becomes the published snapshot.
 * If the write fails, the previous published version remains.
 */
export async function publishStore(): Promise<CommerceDocument> {
  const current = await readRaw();
  const published: StoreConfig = {
    ...current.draft,
    status: "published",
  };
  const next: CommerceDocument = {
    draft: published,
    published,
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await store.write(next);

  try {
    const website = await readWebsite();
    await writeWebsite({
      ...website,
      enabled: true,
      theme: themeToWebsite(published.themeId),
      announcementBar: published.announcement,
      heroHeadline: published.name,
      heroSubline: published.description,
      seoTitle: published.seoTitle,
      seoDescription: published.seoDescription,
      socialFacebook: published.social.facebook,
      socialInstagram: published.social.instagram,
      socialTwitter: published.social.twitter,
      socialTiktok: published.social.tiktok,
      whatsappNumber: published.social.whatsapp,
    });
  } catch {
    // CMS sync is best-effort; published commerce snapshot is source of truth.
  }

  return next;
}

export async function unpublishStore(): Promise<CommerceDocument> {
  const current = await readRaw();
  const next: CommerceDocument = {
    ...current,
    published: current.published
      ? { ...current.published, status: "suspended" }
      : null,
    updatedAt: new Date().toISOString(),
  };
  await store.write(next);
  try {
    const website = await readWebsite();
    await writeWebsite({ ...website, enabled: false });
  } catch {
    // ignore
  }
  return next;
}
