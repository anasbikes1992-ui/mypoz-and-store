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
import { writeAudit } from "./audit-store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  findStorefrontOrderBySaleOrReceipt,
} from "./storefront-orders-store";

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

  await writeAudit({
    actor: "payments-webhook",
    action: "sale.complete_pending",
    entity: "sale",
    entityId: sale.id,
    detail: "Gateway verified PAID",
  });

  return sale;
}

async function completePendingSaleDurable(saleIdOrReceipt: string): Promise<Sale> {
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

  await writeAudit({
    actor: "payments-webhook",
    action: "sale.complete_pending",
    entity: "sale",
    entityId: sale.id,
    detail: "Gateway verified PAID (durable)",
  });

  return sale;
}
