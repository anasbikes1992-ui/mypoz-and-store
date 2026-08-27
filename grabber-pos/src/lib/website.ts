import { z } from "zod";
import { optionalLkWhatsAppContact } from "@/lib/whatsapp/phone";

/** Visual theme presets for the public storefront. */
export const THEME_PRESETS = ["classic", "minimal", "bold", "local"] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export const PAYMENT_MODES = ["cash", "card", "bank_transfer"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const FULFILMENT_MODES = ["pickup", "courier", "pickme", "uber"] as const;
export type FulfilmentMode = (typeof FULFILMENT_MODES)[number];

export const bannerSchema = z.object({
  id: z.string().min(1).max(64),
  imageUrl: z.string().min(1).max(500),
  alt: z.string().max(160).default(""),
  href: z.string().max(500).optional(),
});

export type WebsiteBanner = z.infer<typeof bannerSchema>;

export const websiteSchema = z.object({
  enabled: z.boolean().default(true),
  theme: z.enum(THEME_PRESETS).default("classic"),
  announcementBar: z.string().max(200).default(""),
  banners: z.array(bannerSchema).max(8).default([]),
  heroHeadline: z.string().max(160).default(""),
  heroSubline: z.string().max(300).default(""),
  about: z.string().max(2000).default(""),
  seoTitle: z.string().max(120).default(""),
  seoDescription: z.string().max(320).default(""),
  ogImageUrl: z.string().max(500).default(""),
  socialFacebook: z.string().max(200).default(""),
  socialInstagram: z.string().max(200).default(""),
  socialTwitter: z.string().max(200).default(""),
  socialTiktok: z.string().max(200).default(""),
  whatsappNumber: optionalLkWhatsAppContact,
  whatsappOrderTemplate: z
    .string()
    .max(800)
    .default("Hello {{business}}, I'd like to order:\n\n{{items}}\n\nTotal: {{total}}"),
  whatsappCatalogTemplate: z
    .string()
    .max(500)
    .default("Browse our catalog: {{catalogUrl}}"),
  paymentModes: z
    .array(z.enum(PAYMENT_MODES))
    .min(1)
    .default(["cash", "card", "bank_transfer"]),
  fulfilmentModes: z
    .array(z.enum(FULFILMENT_MODES))
    .min(1)
    .default(["pickup", "courier", "pickme", "uber"]),
  bankTransferInstructions: z
    .string()
    .max(1000)
    .default("Transfer to our bank account and enter the reference on checkout. Staff will confirm payment."),
  pickupInstructions: z
    .string()
    .max(500)
    .default("Collect from the store during opening hours. Bring your order number."),
});

export type WebsiteConfig = z.infer<typeof websiteSchema>;

export const DEFAULT_WEBSITE: WebsiteConfig = websiteSchema.parse({});

export const THEME_LABELS: Record<ThemePreset, string> = {
  classic: "Classic",
  minimal: "Minimal",
  bold: "Bold",
  local: "Local",
};

export const PAYMENT_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  card: "Card / online pay",
  bank_transfer: "Bank transfer",
};

/** Customer-facing payment label; cash depends on fulfilment. */
export function paymentLabel(
  mode: PaymentMode,
  fulfilment?: FulfilmentMode | null,
): string {
  if (mode === "cash") {
    return fulfilment === "pickup" ? "Cash at pickup" : "Cash on delivery";
  }
  return PAYMENT_LABELS[mode];
}

/** Short helper under the cash payment option on checkout. */
export function paymentCashHint(fulfilment: FulfilmentMode): string {
  return fulfilment === "pickup"
    ? "Pay at the counter when collecting."
    : "Pay the courier when delivered.";
}

export const FULFILMENT_LABELS: Record<FulfilmentMode, string> = {
  pickup: "Click & collect / pickup",
  courier: "Courier delivery",
  pickme: "PickMe (staff books)",
  uber: "Uber (staff books)",
};

/** CSS class applied to the storefront root for a theme preset. */
export function storefrontThemeClass(theme: ThemePreset): string {
  return `theme-storefront theme-storefront-${theme}`;
}
