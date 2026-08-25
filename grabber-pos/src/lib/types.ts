export interface Product {
  id: string;
  name: string;
  nameLocal: string | null;
  barcodes: string[];
  brand: string | null;
  stockDate: string | null;
  costPrice: number;
  salePrice: number;
  wholesalePrice: number | null;
  /** VIP / preferred customer tier price. */
  vipPrice?: number | null;
  /** Minimum qty when selling wholesale (0 = no MOQ). */
  minWholesaleQty?: number;
  maxDiscount: number;
  singleDiscount: number;
  quantity: number;
  category: string;
  expireDate: string | null;
  warrantyMonths: number;
  supplier: string | null;
  /** Optional product image URL. */
  imageUrl?: string | null;
  /**
   * When false, product is hidden from the public storefront.
   * Unset / true = visible (demo JSON often omits the flag).
   */
  onlineVisible?: boolean;
  /** Set when adding a specific SKU from the POS variant picker. */
  variantId?: string;
}

export interface CartLine {
  productId: string;
  name: string;
  /** Retail unit price (may be overridden). */
  unitPrice: number;
  /** Wholesale unit price, if the product has one (may be overridden). */
  wholesalePrice: number | null;
  /** VIP unit price (may be overridden). */
  vipPrice?: number | null;
  /** Catalog retail price at add-time (for override detection). */
  catalogUnitPrice?: number;
  /** Catalog wholesale price at add-time (for override detection). */
  catalogWholesalePrice?: number | null;
  catalogVipPrice?: number | null;
  /** Product MOQ for wholesale / VIP bulk. */
  minWholesaleQty?: number;
  quantity: number;
  /** Per-unit discount amount (LKR), capped at product.maxDiscount */
  discount: number;
  maxDiscount: number;
  available: number;
  /** Optional serial / IMEI for electronics. */
  serial?: string;
  /** Non-stock / ad-hoc line. */
  custom?: boolean;
  /** Restaurant-style modifiers. */
  modifiers?: string[];
  /** Canonical product_variants.id when this line is a SKU. */
  variantId?: string | null;
  variantSku?: string | null;
  variantTitle?: string | null;
}

export type PaymentMethod = "cash" | "card" | "wholesale" | "split";

export interface SaleLine {
  /** Durable sale_lines.id when present (required for linked returns). */
  id?: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
  serial?: string;
  modifiers?: string[];
}

export interface Sale {
  id: string;
  /** Human receipt number when distinct from durable UUID id. */
  receiptNo?: string;
  createdAt: string;
  lines: SaleLine[];
  subtotal: number;
  /** Sum of per-line discounts. */
  discountTotal: number;
  /** Whole-bill discount applied after line discounts (LKR). */
  finalDiscount: number;
  /** Service charge added to the bill (LKR). */
  serviceCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  /** Wholesale pricing was used for this sale. */
  isWholesale: boolean;
  customerName: string | null;
  customerMobile: string | null;
  employee: string | null;
  cashReceived: number | null;
  change: number | null;
  status?: "completed" | "voided" | "pending";
  voidReason?: string | null;
  voidedAt?: string | null;
  cashAmount?: number | null;
  cardAmount?: number | null;
  /** Commerce channel when sale originated online. */
  source?: "POS" | "ONLINE_STORE" | "WHATSAPP" | "PHONE" | "OTHER";
  fulfillmentStatus?: string;
  paymentStatus?: string;
  deliveryAddress?: string | null;
  deliveryFee?: number;
  codFee?: number;
}

export type TicketStation = "KOT" | "BOT" | "RECEIPT" | "DRAWER";
