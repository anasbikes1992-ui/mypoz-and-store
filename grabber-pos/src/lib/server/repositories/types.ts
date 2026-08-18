import type { Product, Sale, PaymentMethod } from "@/lib/types";

export interface ProductQuery {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  categories: { name: string; count: number }[];
}

export interface SaleLineInput {
  productId: string;
  quantity: number;
  discount: number;
  name?: string;
  unitPrice?: number;
  serial?: string;
  modifiers?: string[];
  custom?: boolean;
  variantId?: string | null;
  variantSku?: string | null;
}

export interface CreateSaleInput {
  lines: SaleLineInput[];
  paymentMethod: PaymentMethod;
  serviceCharge?: number;
  finalDiscount?: number;
  isWholesale?: boolean;
  customerName?: string;
  customerMobile?: string;
  employee?: string;
  cashReceived?: number;
  cashAmount?: number;
  cardAmount?: number;
  managerPin?: string;
  clientUuid?: string;
  status?: "pending" | "completed";
  /** Commerce channel — stamped on sales.source in durable mode. */
  source?: "POS" | "ONLINE_STORE" | "WHATSAPP" | "PHONE" | "OTHER";
  channel?: string;
  fulfillmentStatus?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  deliveryFee?: number;
  codFee?: number;
}

export interface InventoryStats {
  productCount: number;
  stockValue: number;
  lowStock: number;
  expired: number;
}

export interface SalesStats {
  todayCount: number;
  todayRevenue: number;
  totalCount: number;
  totalRevenue: number;
}

/**
 * Backend-agnostic data access. Implemented twice:
 *  - SupabaseRepository (durable, multi-tenant, production)
 *  - LocalRepository    (bundled JSON, zero-config dev/eval)
 */
export interface PosRepository {
  queryProducts(q: ProductQuery): Promise<ProductPage>;
  findByBarcode(code: string): Promise<Product | null>;
  inventoryStats(): Promise<InventoryStats>;

  listSales(limit?: number): Promise<Sale[]>;
  createSale(input: CreateSaleInput): Promise<Sale>;
  voidSale(
    id: string,
    reason: string,
    actor?: string,
  ): Promise<Sale>;
  salesStats(): Promise<SalesStats>;
}
