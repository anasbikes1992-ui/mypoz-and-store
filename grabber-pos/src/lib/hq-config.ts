import { z } from "zod";
import { COMMERCE_THEME_IDS, LOCALES } from "@/lib/commerce/schema";

export const hqPlatformSchema = z.object({
  supportEmail: z.string().max(160).default(""),
  supportPhone: z.string().max(40).default(""),
  defaultLocale: z.enum(LOCALES).default("en"),
  defaultThemeId: z.enum(COMMERCE_THEME_IDS).default("local"),
  announcement: z.string().max(200).default(""),
  webhookBaseUrl: z.string().max(300).default(""),
  flags: z
    .object({
      storefront: z.boolean().default(true),
      whatsapp: z.boolean().default(true),
      wholesale: z.boolean().default(true),
      hqTickets: z.boolean().default(true),
    })
    .default({
      storefront: true,
      whatsapp: true,
      wholesale: true,
      hqTickets: true,
    }),
});

export type HqPlatformConfig = z.infer<typeof hqPlatformSchema>;

export const DEFAULT_HQ_PLATFORM: HqPlatformConfig = hqPlatformSchema.parse({});

export const hqTenantOpsSchema = z.object({
  storeThemeId: z.enum(COMMERCE_THEME_IDS).default("local"),
  announcement: z.string().max(200).default(""),
  locale: z.enum(LOCALES).default("en"),
  storeEnabled: z.boolean().default(true),
  whatsappEnabled: z.boolean().default(true),
  wholesaleEnabled: z.boolean().default(true),
  supportNote: z.string().max(400).default(""),
});

export type HqTenantOps = z.infer<typeof hqTenantOpsSchema>;

export const DEFAULT_HQ_TENANT_OPS: HqTenantOps = hqTenantOpsSchema.parse({});

export const HQ_EXTRA_KEYS = [
  "whatsapp",
  "knowledge",
  "category",
  "restaurant",
  "delivery",
  "repair",
  "service",
  "reloads",
  "rooms",
  "rent",
  "hire",
  "play",
  "layaway",
  "click-collect",
  "digital",
] as const;
