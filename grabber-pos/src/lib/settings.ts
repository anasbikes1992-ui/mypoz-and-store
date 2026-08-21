import { z } from "zod";
import type { FieldDef } from "./collections";

export interface SettingsSection {
  label: string;
  fields: FieldDef[];
  /** Hide unless any of these module keys are enabled on the tenant plan. */
  requiresAny?: string[];
}

/** Business settings, grouped for the Settings screen. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    label: "Business profile",
    fields: [
      { key: "businessName", label: "Business name", type: "text", full: true },
      { key: "address", label: "Address", type: "textarea", full: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "currency", label: "Currency", type: "text" },
      { key: "timezone", label: "Timezone", type: "text" },
    ],
  },
  {
    label: "Receipt",
    fields: [
      { key: "receiptHeader", label: "Header text", type: "textarea", full: true },
      { key: "receiptFooter", label: "Footer text", type: "textarea", full: true },
      { key: "paperWidth", label: "Paper width", type: "select", options: ["80mm", "58mm"] },
      { key: "showQr", label: "Show QR", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    label: "Tax",
    fields: [
      { key: "taxPercent", label: "Tax / VAT % (default)", type: "number" },
      { key: "taxRateA", label: "Tax rate A %", type: "number" },
      { key: "taxRateB", label: "Tax rate B %", type: "number" },
      { key: "taxInclusive", label: "Prices include tax", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    label: "Training",
    fields: [
      { key: "trainingMode", label: "Training mode", type: "select", options: ["Yes", "No"] },
    ],
  },
  {
    label: "Printers (ESC/POS over TCP)",
    requiresAny: ["retail", "restaurant"],
    fields: [
      { key: "printerReceiptIp", label: "Receipt printer IP", type: "text" },
      { key: "printerKotIp", label: "KOT printer IP", type: "text" },
      { key: "printerBotIp", label: "BOT printer IP", type: "text" },
    ],
  },
  {
    label: "WhatsApp invoices",
    requiresAny: ["whatsapp"],
    fields: [
      { key: "whatsappCountryCode", label: "Default country code", type: "text" },
    ],
  },
  {
    label: "Loyalty points",
    requiresAny: ["loyalty", "customers"],
    fields: [
      { key: "pointsPerCurrency", label: "Spend per 1 point (LKR)", type: "number" },
      { key: "pointsValue", label: "1 point = (LKR)", type: "number" },
    ],
  },
  {
    label: "Email (Resend)",
    fields: [
      { key: "resendFromEmail", label: "From address (e.g. MyPoz Store <noreply@yourdomain.com>)", type: "text", full: true },
      { key: "resendReplyTo", label: "Reply-to address", type: "email" },
    ],
  },
  {
    label: "Website Storefront & Marketing (SEO / Ads)",
    requiresAny: ["commerce", "website", "commerce-onboarding"],
    fields: [
      { key: "storeEnabled", label: "Enable Public Website", type: "select", options: ["Yes", "No"] },
      { key: "storeSlug", label: "Website URL Slug (e.g. apex-retail)", type: "text" },
      {
        key: "storeSlugAliases",
        label: "Legacy URL aliases (comma-separated → storeSlug)",
        type: "text",
        full: true,
      },
      { key: "storeSlogan", label: "Store Slogan / Subtitle", type: "text", full: true },
      { key: "storeBanner", label: "Hero Banner Image URL", type: "text", full: true },
      { key: "googleAdsId", label: "Google Ads / GTAG ID (AW-xxx)", type: "text" },
      { key: "metaPixelId", label: "Meta (Facebook) Pixel ID", type: "text" },
      { key: "socialWhatsapp", label: "WhatsApp Order Contact Number", type: "text" },
    ],
  },
];

export const settingsSchema = z.object({
  businessName: z.string().max(160).default("MyPoz Store"),
  address: z.string().max(300).default(""),
  phone: z.string().max(40).default(""),
  email: z.string().max(120).default(""),
  currency: z.string().max(10).default("LKR"),
  timezone: z.string().max(60).default("Asia/Colombo"),
  receiptHeader: z.string().max(300).default(""),
  receiptFooter: z.string().max(300).default("Thank you — come again!"),
  paperWidth: z.enum(["80mm", "58mm"]).default("80mm"),
  showQr: z.enum(["Yes", "No"]).default("No"),
  taxPercent: z.coerce.number().min(0).max(100).default(0),
  taxRateA: z.coerce.number().min(0).max(100).default(0),
  taxRateB: z.coerce.number().min(0).max(100).default(0),
  taxInclusive: z.enum(["Yes", "No"]).default("Yes"),
  trainingMode: z.enum(["Yes", "No"]).default("No"),
  printerReceiptIp: z.string().max(60).default(""),
  printerKotIp: z.string().max(60).default(""),
  printerBotIp: z.string().max(60).default(""),
  whatsappCountryCode: z.string().max(5).default("94"),
  pointsPerCurrency: z.coerce.number().min(1).default(100),
  pointsValue: z.coerce.number().min(0).default(1),
  storeEnabled: z.enum(["Yes", "No"]).default("Yes"),
  storeSlug: z.string().max(80).default("main-store"),
  /** Comma-separated legacy slugs that 308-redirect to storeSlug. */
  storeSlugAliases: z.string().max(200).default(""),
  storeSlogan: z.string().max(300).default("Your Quality Everyday Store — Shop Online & Fast Delivery"),
  storeBanner: z.string().max(500).default(""),
  googleAdsId: z.string().max(60).default(""),
  metaPixelId: z.string().max(60).default(""),
  socialWhatsapp: z.string().max(30).default(""),
  resendFromEmail: z.string().max(200).default(""),
  resendReplyTo: z.string().max(120).default(""),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});
