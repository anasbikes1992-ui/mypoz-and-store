import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, Sale } from "@/lib/types";
import type {
  PosRepository,
  ProductQuery,
  ProductPage,
  CreateSaleInput,
  InventoryStats,
  SalesStats,
} from "./types";
import { assertLicenceActive } from "@/lib/server/licence-guard";
import { parseCommerceLineId } from "@/lib/commerce/line-ids";

/**
 * Durable, multi-tenant repository. All reads/writes are RLS-scoped to the
 * authenticated user's organization; sale posting goes through the atomic
 * create_sale RPC.
 */
export class SupabaseRepository implements PosRepository {
  constructor(
    private readonly db: SupabaseClient,
    private readonly branchId: string,
  ) {}

  async queryProducts(q: ProductQuery): Promise<ProductPage> {
    const { data, error } = await this.db.rpc("catalog", {
      p_branch: this.branchId,
      p_search: q.search ?? null,
      p_category: q.category ?? null,
      p_page: q.page ?? 1,
      p_page_size: q.pageSize ?? 60,
    });
    if (error) throw new Error(error.message);
    const result = data as {
      items: Product[];
      total: number;
      categories: { name: string; count: number }[];
    };
    return {
      items: result.items,
      total: result.total,
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 60,
      categories: result.categories,
    };
  }

  async findByBarcode(code: string): Promise<Product | null> {
    const { data, error } = await this.db.rpc("product_by_barcode", {
      p_branch: this.branchId,
      p_code: code,
    });
    if (error) throw new Error(error.message);
    return (data as Product | null) ?? null;
  }

  async inventoryStats(): Promise<InventoryStats> {
    const { data, error } = await this.db.rpc("inventory_stats", {
      p_branch: this.branchId,
    });
    if (error) throw new Error(error.message);
    return data as InventoryStats;
  }

  async listSales(limit = 100): Promise<Sale[]> {
    const { data, error } = await this.db
      .from("sales")
      .select(
        "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, delivery_fee, cod_fee, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, source, status, sale_lines(id, product_id, name, unit_price, quantity, discount, line_total)",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSaleRow);
  }

  async salesStats(): Promise<SalesStats> {
    const today = new Date().toISOString().slice(0, 10);
    const [todayRes, allRes] = await Promise.all([
      this.db.from("sales").select("total").gte("created_at", today),
      this.db.from("sales").select("total"),
    ]);
    const sum = (rows: { total: number }[] | null) =>
      (rows ?? []).reduce((s, r) => s + Number(r.total), 0);
    return {
      todayCount: todayRes.data?.length ?? 0,
      todayRevenue: sum(todayRes.data),
      totalCount: allRes.data?.length ?? 0,
      totalRevenue: sum(allRes.data),
    };
  }

  async createSale(input: CreateSaleInput): Promise<Sale> {
    await assertLicenceActive();

    // Card / online must never complete stock before gateway verification.
    const forcePending =
      input.status === "pending" ||
      input.paymentStatus === "pending" ||
      input.paymentMethod === "card";
    if (forcePending) {
      return this.createPendingCardSale(input);
    }

    const { data, error } = await this.db.rpc("create_sale", {
      payload: {
        branch_id: this.branchId,
        client_uuid: input.clientUuid ?? null,
        payment_method: input.paymentMethod,
        service_charge: (input.serviceCharge ?? 0),
        final_discount: input.finalDiscount ?? 0,
        customer_name: input.customerName ?? null,
        customer_mobile: input.customerMobile ?? null,
        employee: input.employee ?? null,
        cash_received: input.cashReceived ?? null,
        source: input.source ?? "POS",
        channel: input.channel ?? null,
        fulfillment_status: input.fulfillmentStatus ?? "pending",
        payment_status: input.paymentStatus ?? "paid",
        delivery_address: input.deliveryAddress ?? null,
        delivery_fee: input.deliveryFee ?? 0,
        cod_fee: input.codFee ?? 0,
        lines: input.lines.map((l) => {
          const parsed = parseCommerceLineId(l.productId);
          return {
            product_id: parsed.productId,
            variant_id: l.variantId ?? parsed.variantId,
            variant_sku: l.variantSku ?? parsed.variantSku,
            quantity: l.quantity,
            discount: l.discount,
          };
        }),
      },
    });
    if (error) throw new Error(error.message);
    return mapSaleRow(data as SaleRpcRow);
  }

  /**
   * Card/gateway pending: create payment_intent only — no stock movement.
   * Webhook PAID → completePendingSale → create_sale_internal / storefront path.
   */
  private async createPendingCardSale(input: CreateSaleInput): Promise<Sale> {
    const clientUuid = input.clientUuid ?? crypto.randomUUID();
    const amountMinor = Math.round(
      (input.lines.reduce((sum, line) => {
        const unit = Number(line.unitPrice ?? 0);
        return sum + (unit - Number(line.discount ?? 0)) * Number(line.quantity);
      }, 0) +
        Number(input.serviceCharge ?? 0) -
        Number(input.finalDiscount ?? 0)) *
        100,
    );

    const pendingSale = {
      branch_id: this.branchId,
      payment_method: input.paymentMethod,
      service_charge: input.serviceCharge ?? 0,
      final_discount: input.finalDiscount ?? 0,
      customer_name: input.customerName ?? null,
      customer_mobile: input.customerMobile ?? null,
      employee: input.employee ?? null,
      source: input.source ?? "POS",
      lines: input.lines.map((l) => {
        const parsed = parseCommerceLineId(l.productId);
        return {
          product_id: parsed.productId,
          variant_id: l.variantId ?? parsed.variantId,
          quantity: l.quantity,
          discount: l.discount,
          name: l.name,
          unit_price: l.unitPrice,
        };
      }),
    };

    const { data, error } = await (this.db as any).rpc("create_pos_payment_intent", {
      payload: {
        branch_id: this.branchId,
        client_uuid: clientUuid,
        amount_minor: Math.max(amountMinor, 1),
        currency: "LKR",
        provider: "POS_GATEWAY",
        customer_name: input.customerName ?? null,
        customer_email: null,
        pending_sale: pendingSale,
        reference: `POS-${clientUuid.replace(/-/g, "").slice(0, 12).toUpperCase()}`,
      },
    });
    if (error) throw new Error(error.message);
    const row = data as {
      reference: string;
      created_at: string;
      amount_minor: number;
      client_uuid?: string;
    };

    return {
      id: row.reference,
      receiptNo: row.reference,
      createdAt: row.created_at,
      subtotal: row.amount_minor / 100,
      discountTotal: Number(input.finalDiscount ?? 0),
      finalDiscount: Number(input.finalDiscount ?? 0),
      serviceCharge: Number(input.serviceCharge ?? 0),
      total: row.amount_minor / 100,
      paymentMethod: input.paymentMethod,
      isWholesale: input.paymentMethod === "wholesale",
      customerName: input.customerName ?? null,
      customerMobile: input.customerMobile ?? null,
      employee: input.employee ?? null,
      cashReceived: null,
      change: null,
      status: "pending",
      voidReason: null,
      voidedAt: null,
      source: input.source ?? "POS",
      paymentStatus: "pending",
      lines: input.lines.map((l) => ({
        productId: l.productId,
        name: l.name ?? l.productId,
        unitPrice: Number(l.unitPrice ?? 0),
        quantity: l.quantity,
        discount: l.discount,
        lineTotal:
          (Number(l.unitPrice ?? 0) - Number(l.discount ?? 0)) * l.quantity,
      })),
    };
  }

  async voidSale(id: string, reason: string, _actor?: string): Promise<Sale> {
    let saleId = id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      const { data: byReceipt, error: lookupError } = await this.db
        .from("sales")
        .select("id")
        .eq("receipt_no", id)
        .maybeSingle();
      if (lookupError) throw new Error(lookupError.message);
      if (!byReceipt?.id) throw new Error("Sale not found");
      saleId = byReceipt.id;
    }
    const { data, error } = await this.db.rpc("void_sale", {
      p_sale: saleId,
      p_reason: reason,
    });
    if (error) throw new Error(error.message);
    return mapSaleRow(data as SaleRpcRow);
  }
}

interface SaleRpcRow {
  id: string;
  receipt_no?: string;
  created_at: string;
  subtotal: number;
  discount_total: number;
  final_discount?: number;
  service_charge?: number;
  delivery_fee?: number;
  cod_fee?: number;
  total: number;
  payment_method: string;
  customer_name?: string | null;
  customer_mobile?: string | null;
  employee?: string | null;
  cash_received: number | null;
  change_due: number | null;
  status?: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
  source?: string | null;
  lines?: RawLine[];
  sale_lines?: RawLine[];
}

interface RawLine {
  id?: string;
  product_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  line_total: number;
}

function mapSaleRow(row: SaleRpcRow): Sale {
  const rawLines = row.lines ?? row.sale_lines ?? [];
  return {
    id: row.id,
    receiptNo: row.receipt_no ?? undefined,
    createdAt: row.created_at,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    codFee: Number(row.cod_fee ?? 0),
    total: Number(row.total),
    paymentMethod: row.payment_method as Sale["paymentMethod"],
    isWholesale: row.payment_method === "wholesale",
    customerName: row.customer_name ?? null,
    customerMobile: row.customer_mobile ?? null,
    employee: row.employee ?? null,
    cashReceived: row.cash_received != null ? Number(row.cash_received) : null,
    change: row.change_due != null ? Number(row.change_due) : null,
    status: (row.status as Sale["status"]) ?? "completed",
    voidReason: row.void_reason ?? null,
    voidedAt: row.voided_at ?? null,
    source: (row.source as Sale["source"]) ?? "POS",
    lines: rawLines.map((l) => ({
      id: l.id,
      productId: l.product_id ?? "",
      name: l.name,
      unitPrice: Number(l.unit_price),
      quantity: Number(l.quantity),
      discount: Number(l.discount),
      lineTotal: Number(l.line_total),
    })),
  };
}
