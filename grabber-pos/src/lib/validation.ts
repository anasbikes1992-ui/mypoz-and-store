import { z } from "zod";

export const saleLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  discount: z.number().min(0).default(0),
  name: z.string().max(200).optional(),
  unitPrice: z.number().min(0).optional(),
  serial: z.string().max(120).optional(),
  modifiers: z.array(z.string().max(80)).optional(),
  custom: z.boolean().optional(),
  variantId: z.string().max(80).optional(),
  variantSku: z.string().max(80).optional(),
});

export const createSaleSchema = z.object({
  lines: z.array(saleLineSchema).min(1, "Sale must contain at least one line"),
  paymentMethod: z.enum(["cash", "card", "wholesale", "split"]),
  serviceCharge: z.number().min(0).default(0),
  finalDiscount: z.number().min(0).default(0),
  isWholesale: z.boolean().default(false),
  customerName: z.string().max(120).optional(),
  customerMobile: z.string().max(20).optional(),
  employee: z.string().max(120).optional(),
  cashReceived: z.number().min(0).optional(),
  cashAmount: z.number().min(0).optional(),
  cardAmount: z.number().min(0).optional(),
  managerPin: z.string().max(32).optional(),
  clientUuid: z.string().min(8).max(64).optional(),
  source: z.enum(["POS", "ONLINE_STORE", "WHATSAPP", "PHONE", "OTHER"]).optional(),
  channel: z.string().max(40).optional(),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(60),
});

export type CreateSaleBody = z.infer<typeof createSaleSchema>;

export const productInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  nameLocal: z.string().max(200).nullish(),
  barcodes: z.array(z.string().min(1)).default([]),
  brand: z.string().max(120).nullish(),
  costPrice: z.number().min(0).default(0),
  salePrice: z.number().min(0, "Sale price is required"),
  wholesalePrice: z.number().min(0).nullish(),
  maxDiscount: z.number().min(0).default(0),
  singleDiscount: z.number().min(0).default(0),
  quantity: z.number().default(0),
  category: z.string().max(120).default("Uncategorized"),
  expireDate: z.string().nullish(),
  warrantyMonths: z.number().int().min(0).default(0),
  supplier: z.string().max(120).nullish(),
  imageUrl: z.string().max(500).nullish(),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const stockOpSchema = z.object({
  party: z.string().max(160).optional(),
  reference: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
  date: z.string().max(20).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1, "Add at least one line"),
});
