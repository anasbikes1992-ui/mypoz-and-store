import "server-only";
import { createHash } from "crypto";
import { findById } from "@/lib/server/product-repo";
import { upsertOverride } from "@/lib/server/product-write-store";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "./persistence/local-json";
import type { Sale } from "@/lib/types";
import { isSupabaseEnabled, requireSupabase } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  findStorefrontOrderBySaleOrReceipt,
} from "./storefront-orders-store";
import { writeAuditEvent } from "./audit-service";

const SALES_FILE = dataFile("sales.json");

function deterministicClientUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  const base = hex.slice(0, 32).split("");
  base[12] = "4";
  const variant = Number.parseInt(base[16] ?? "0", 16);
  base[16] = ((variant & 0x3) | 0x8).toString(16);
  const compact = base.join("");
  return [
    compact.slice(0, 8),
    compact.slice(8, 12),
    compact.slice(12, 16),
    compact.slice(16, 20),
    compact.slice(20, 32),
  ].join("-");
}

/**
 * Complete a PENDING storefront/card sale after verified gateway webhook.
 * This is the ONLY path that flips pending → completed and decrements stock
 * for card/online payments.
 *
 * Local demo: pending rows live in sales.json.
 * Durable (Supabase): pending web orders live in storefront-orders; we post
 * via create_sale_internal (service role) so stock moves only after PAID.
 */
export async function completePendingSale(
  saleIdOrReceipt: string,
): Promise<Sale> {
  if (isSupabaseEnabled && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return await completePendingSaleDurable(saleIdOrReceipt);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Fail closed when the durable service ledger is active.
      throw new Error(msg);
    }
  }

  if (requireSupabase || isSupabaseEnabled) {
    throw new Error(
      "DEPENDENCY_UNAVAILABLE: pending sale completion requires service role",
    );
  }

  let completed: Sale | undefined;

  await withFileLock(SALES_FILE, async () => {
    const sales = await readJsonFile<Sale[]>(SALES_FILE, []);
    const idx = sales.findIndex(
      (s) =>
        s.id === saleIdOrReceipt ||
        (s as { receiptNo?: string }).receiptNo === saleIdOrReceipt,
    );
    if (idx < 0) throw new Error(`PENDING_SALE_NOT_FOUND:${saleIdOrReceipt}`);

    const existing = sales[idx]!;
    if (existing.status === "completed") {
      completed = existing;
      return;
    }
    if (existing.status === "voided") {
      throw new Error(`SALE_VOIDED:${saleIdOrReceipt}`);
    }
    if (existing.status !== "pending") {
      throw new Error(`SALE_NOT_PENDING:${saleIdOrReceipt}`);
    }

    const next: Sale = {
      ...existing,
      status: "completed",
    };
    sales[idx] = next;
    await writeJsonFile(SALES_FILE, sales);
    completed = next;
  });

  if (!completed) throw new Error(`PENDING_SALE_NOT_FOUND:${saleIdOrReceipt}`);
  const sale = completed;

  for (const line of sale.lines) {
    if (line.productId.startsWith("CUSTOM")) continue;
    const colon = line.productId.indexOf(":");
    const lookupId = colon > 0 ? line.productId.slice(0, colon) : line.productId;
    const product = findById(lookupId);
    if (!product) continue;
    const qty = Math.max(0, Number(product.quantity) - line.quantity);
    await upsertOverride({ ...product, quantity: qty });
  }

  try {
    const { recordSaleOnShift } = await import("@/lib/server/register-store");
    await recordSaleOnShift({
      id: sale.id,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      cashReceived: sale.cashReceived,
    });
  } catch {
    // No open shift — non-fatal for storefront
  }

  await writeAuditEvent({
    action: "sale.complete_pending",
    entity: "sale",
    entityId: sale.id,
    details: "Gateway verified PAID",
    actorLabel: "payments-webhook",
    useServiceRole: false,
  });

  return sale;
}

async function completePosPaymentIntent(
  saleIdOrReceipt: string,
): Promise<Sale | null> {
  const db = createServiceSupabase();
  const { data: intent, error } = await (db as any)
    .from("payment_intents")
    .select("*")
    .eq("reference", saleIdOrReceipt)
    .eq("source", "pos")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!intent) return null;

  const meta = (intent.metadata ?? {}) as Record<string, unknown>;
  if (meta.completedAt && intent.sale_id) {
    const { data: existing } = await db
      .from("sales")
      .select(
        "id, receipt_no, created_at, subtotal, discount_total, final_discount, service_charge, delivery_fee, cod_fee, total, payment_method, customer_name, customer_mobile, employee, cash_received, change_due, status, sale_lines(product_id, name, unit_price, quantity, discount, line_total)",
      )
      .eq("id", intent.sale_id)
      .maybeSingle();
    if (existing) {
      return mapSaleRowCompat(existing as any);
    }
  }

  const pendingSale = (meta.pendingSale ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(pendingSale.lines) ? pendingSale.lines : [];
  if (lines.length === 0) {
    throw new Error(`PENDING_SALE_NOT_FOUND:${saleIdOrReceipt}`);
  }

  const clientUuid =
    intent.client_uuid ||
    deterministicClientUuid(String(intent.reference || saleIdOrReceipt));

  const { data, error: saleError } = await db.rpc("create_sale_internal", {
    p_org: intent.org_id,
    p_actor: null,
    payload: {
      branch_id: intent.branch_id ?? pendingSale.branch_id,
      client_uuid: clientUuid,
      payment_method: pendingSale.payment_method ?? "card",
      service_charge: pendingSale.service_charge ?? 0,
      final_discount: pendingSale.final_discount ?? 0,
      customer_name: pendingSale.customer_name ?? intent.customer_name,
      customer_mobile: pendingSale.customer_mobile ?? null,
      employee: pendingSale.employee ?? null,
      source: pendingSale.source ?? "POS",
      payment_status: "paid",
      lines: lines.map((l: any) => ({
        product_id: l.product_id,
        variant_id: l.variant_id,
        quantity: l.quantity,
        discount: l.discount ?? 0,
      })),
    } as any,
  });
  if (saleError) throw new Error(saleError.message);

  const posted = data as Record<string, unknown>;
  const saleId = String(posted.id);
  await (db as any)
    .from("payment_intents")
    .update({
      status: "paid",
      sale_id: saleId,
      metadata: {
        ...meta,
        completedAt: new Date().toISOString(),
        saleId,
      },
    })
    .eq("id", intent.id);

  await writeAuditEvent({
    action: "sale.complete_pending",
    entity: "sale",
    entityId: saleId,
    details: "POS gateway verified PAID",
    orgId: intent.org_id,
    useServiceRole: true,
    actorLabel: "payments-webhook",
    correlationId: String(intent.reference),
  });

  return mapSaleRowCompat(posted);
}

function mapSaleRowCompat(row: any): Sale {
  const rawLines = row.lines ?? row.sale_lines ?? [];
  return {
    id: String(row.receipt_no ?? row.id),
    receiptNo: row.receipt_no,
    createdAt: row.created_at ?? new Date().toISOString(),
    subtotal: Number(row.subtotal ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    finalDiscount: Number(row.final_discount ?? 0),
    serviceCharge: Number(row.service_charge ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    codFee: Number(row.cod_fee ?? 0),
    total: Number(row.total ?? 0),
    paymentMethod: (row.payment_method ?? "card") as Sale["paymentMethod"],
    isWholesale: row.payment_method === "wholesale",
    customerName: row.customer_name ?? null,
    customerMobile: row.customer_mobile ?? null,
    employee: row.employee ?? null,
    cashReceived: row.cash_received != null ? Number(row.cash_received) : null,
    change: row.change_due != null ? Number(row.change_due) : null,
    status: (row.status as Sale["status"]) ?? "completed",
    voidReason: null,
    voidedAt: null,
    source: "POS",
    lines: (rawLines as any[]).map((l) => ({
      productId: l.product_id ?? "",
      name: l.name ?? "",
      unitPrice: Number(l.unit_price ?? 0),
      quantity: Number(l.quantity ?? 0),
      discount: Number(l.discount ?? 0),
      lineTotal: Number(l.line_total ?? 0),
    })),
  };
}

async function completePendingSaleDurable(saleIdOrReceipt: string): Promise<Sale> {
  // POS pending payment_intent path (reference = POS-…)
  const posSale = await completePosPaymentIntent(saleIdOrReceipt);
  if (posSale) return posSale;

  const order = await findStorefrontOrderBySaleOrReceipt(
    saleIdOrReceipt,
    saleIdOrReceipt,
  );
  if (!order) throw new Error(`PENDING_SALE_NOT_FOUND:${saleIdOrReceipt}`);
  if (!order.pendingPayment) {
    return {
      id: order.saleId || order.receiptNo,
      createdAt: order.createdAt,
      subtotal: order.total,
      discountTotal: 0,
      finalDiscount: 0,
      serviceCharge: 0,
      total: order.total,
      paymentMethod: "card",
      isWholesale: false,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      employee: null,
      cashReceived: null,
      change: null,
      status: "completed",
      voidReason: null,
      voidedAt: null,
      lines: order.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        unitPrice: l.unitPrice,
        quantity: l.quantity,
        discount: 0,
        lineTotal: l.unitPrice * l.quantity,
      })),
    };
  }

  const db = createServiceSupabase();
  // Post the paid order through the storefront definer RPC (rebuilds lines
  // server-side and decrements stock). Payment already captured by gateway.
  const { data, error } = await db.rpc("storefront_create_order" as "create_sale", {
    p_host: null,
    p_slug: order.slug,
    p_payload: {
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      clientUuid: deterministicClientUuid(order.id || order.receiptNo || saleIdOrReceipt),
      address: order.address,
      fulfilment: order.fulfilment,
      paymentMethod: order.paymentMethod,
      deliveryFee: order.deliveryFee ?? 0,
      codFee: order.codFee ?? 0,
      final_discount: order.finalDiscount ?? 0,
      lines: order.lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        variantId: l.variantId,
      })),
    },
  } as never);

  if (error) throw new Error(error.message);

  const posted = data as Record<string, unknown> | null;
  const receipt =
    (posted?.receipt_no as string) ||
    (posted?.id as string) ||
    order.receiptNo;

  const { updateStorefrontWebOrder } = await import("./storefront-orders-store");
  await updateStorefrontWebOrder(order.id, {
    pendingPayment: false,
    saleId: receipt,
  });

  const sale: Sale = {
    id: receipt,
    createdAt: (posted?.created_at as string) || new Date().toISOString(),
    subtotal: Number(posted?.subtotal ?? order.total),
    discountTotal: Number(posted?.discount_total ?? 0),
    finalDiscount: Number(posted?.final_discount ?? 0),
    serviceCharge: Number(posted?.service_charge ?? 0),
    total: Number(posted?.total ?? order.total),
    paymentMethod: "card",
    isWholesale: false,
    customerName: order.customerName,
    customerMobile: order.customerMobile,
    employee: null,
    cashReceived: null,
    change: null,
    status: "completed",
    voidReason: null,
    voidedAt: null,
    lines: order.lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      unitPrice: l.unitPrice,
      quantity: l.quantity,
      discount: 0,
      lineTotal: l.unitPrice * l.quantity,
    })),
  };

  await writeAuditEvent({
    action: "sale.complete_pending",
    entity: "sale",
    entityId: sale.id,
    details: "Gateway verified PAID (durable)",
    actorLabel: "payments-webhook",
    useServiceRole: true,
    orgId: (posted?.org_id as string) || undefined,
  });

  return sale;
}
