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
        "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, sale_lines(product_id, name, unit_price, quantity, discount, line_total)",
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

    if (input.status === "pending") {
      throw new Error(
        "PENDING card sales are not supported on the durable create_sale RPC yet. Use local pending path or complete via webhook after a pending ledger row.",
      );
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

  async voidSale(id: string, reason: string, _actor?: string): Promise<Sale> {
    const { data, error } = await this.db
      .from("sales")
      .update({
        status: "voided",
        // columns may not exist on all schemas — best-effort
      } as Record<string, unknown>)
      .eq("id", id)
      .select(
        "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, sale_lines(product_id, name, unit_price, quantity, discount, line_total)",
      )
      .maybeSingle();
    if (error) {
      throw new Error(
        `Void sale failed in durable mode: ${error.message}. Reason recorded: ${reason}`,
      );
    }
    if (!data) throw new Error("Sale not found");
    const sale = mapSaleRow(data as SaleRpcRow);
    return { ...sale, status: "voided", voidReason: reason, voidedAt: new Date().toISOString() };
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
  lines?: RawLine[];
  sale_lines?: RawLine[];
}

interface RawLine {
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
    id: row.receipt_no ?? row.id,
    createdAt: row.created_at,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
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
    lines: rawLines.map((l) => ({
      productId: l.product_id ?? "",
      name: l.name,
      unitPrice: Number(l.unit_price),
      quantity: Number(l.quantity),
      discount: Number(l.discount),
      lineTotal: Number(l.line_total),
    })),
  };
}
