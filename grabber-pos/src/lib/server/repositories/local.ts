import "server-only";
import {
  queryProducts,
  findByBarcode,
  findById,
  inventoryStats,
} from "@/lib/server/product-repo";
import {
  listSales,
  createSale as persistSale,
  voidSale as persistVoidSale,
  salesStats,
} from "@/lib/server/sales-repo";
import { writeAudit } from "@/lib/server/audit-store";
import type { Sale, SaleLine } from "@/lib/types";
import type {
  PosRepository,
  ProductQuery,
  ProductPage,
  CreateSaleInput,
  InventoryStats,
  SalesStats,
} from "./types";

/**
 * Zero-config repository over the bundled JSON store.
 * Mirrors the server-side validation the Supabase RPC performs, so the
 * business rules are identical regardless of backend.
 */
export class LocalRepository implements PosRepository {
  async queryProducts(q: ProductQuery): Promise<ProductPage> {
    return queryProducts(q);
  }

  async findByBarcode(code: string) {
    return findByBarcode(code) ?? null;
  }

  async inventoryStats(): Promise<InventoryStats> {
    return inventoryStats();
  }

  async listSales(limit = 100): Promise<Sale[]> {
    return listSales(limit);
  }

  async salesStats(): Promise<SalesStats> {
    return salesStats();
  }

  async voidSale(id: string, reason: string, actor?: string): Promise<Sale> {
    return persistVoidSale(id, reason, actor);
  }

  async createSale(input: CreateSaleInput): Promise<Sale> {
    if (!input.lines?.length) throw new Error("Sale must contain a line");

    const useWholesale =
      !!input.isWholesale || input.paymentMethod === "wholesale";

    const lines: SaleLine[] = [];
    for (const l of input.lines) {
      const isCustom =
        !!l.custom || l.productId.startsWith("CUSTOM");

      if (isCustom) {
        const name = (l.name ?? "").trim() || "Custom item";
        const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
        if (!Number.isInteger(l.quantity) || l.quantity <= 0) {
          throw new Error(`Invalid quantity for ${name}`);
        }
        const discount = Number(l.discount) || 0;
        lines.push({
          productId: l.productId,
          name,
          unitPrice,
          quantity: l.quantity,
          discount,
          lineTotal: (unitPrice - discount) * l.quantity,
          serial: l.serial,
          modifiers: l.modifiers,
        });
        continue;
      }

      // Variant lines use synthetic id `parentId:variantSku`.
      const colon = l.productId.indexOf(":");
      const lookupId =
        colon > 0 ? l.productId.slice(0, colon) : l.productId;
      const product = findById(lookupId);
      if (!product) throw new Error(`Unknown product: ${l.productId}`);
      if (!Number.isInteger(l.quantity) || l.quantity <= 0) {
        throw new Error(`Invalid quantity for ${product.name}`);
      }
      const discount = Number(l.discount) || 0;
      if (discount < 0 || discount > product.maxDiscount) {
        throw new Error(
          `Discount for ${product.name} exceeds max (${product.maxDiscount})`,
        );
      }
      const catalogPrice =
        useWholesale && product.wholesalePrice
          ? product.wholesalePrice
          : product.salePrice;
      // Allow manager price override / variant price from the terminal.
      const unitPrice =
        l.unitPrice != null && !Number.isNaN(Number(l.unitPrice))
          ? Math.max(0, Number(l.unitPrice))
          : catalogPrice;
      const displayName =
        (l.name ?? "").trim() ||
        (colon > 0 ? `${product.name} (${l.productId.slice(colon + 1)})` : product.name);
      lines.push({
        productId: l.productId,
        name: displayName,
        unitPrice,
        quantity: l.quantity,
        discount,
        lineTotal: (unitPrice - discount) * l.quantity,
        serial: l.serial,
        modifiers: l.modifiers,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const discountTotal = lines.reduce((s, l) => s + l.discount * l.quantity, 0);
    const serviceCharge = Math.max(0, Number(input.serviceCharge) || 0);
    const deliveryFee = Math.max(0, Number(input.deliveryFee) || 0);
    const codFee = Math.max(0, Number(input.codFee) || 0);
    const finalDiscount = Math.max(0, Number(input.finalDiscount) || 0);
    const afterLines = subtotal - discountTotal;
    if (finalDiscount > afterLines) {
      throw new Error("Final discount exceeds the bill total");
    }
    // Mirrors create_sale_internal — never fold delivery/COD into serviceCharge.
    const total =
      afterLines - finalDiscount + serviceCharge + deliveryFee + codFee;

    let cashReceived: number | null = null;
    let change: number | null = null;
    let cashAmount: number | null = null;
    let cardAmount: number | null = null;

    if (input.paymentMethod === "split") {
      cashAmount = Math.max(0, Number(input.cashAmount) || 0);
      cardAmount = Math.max(0, Number(input.cardAmount) || 0);
      const tendered = cashAmount + cardAmount;
      if (tendered + 0.01 < total) {
        throw new Error(
          `Split tender (${tendered.toFixed(2)}) is less than total (${total.toFixed(2)})`,
        );
      }
      // Require roughly summing to total (tolerance 0.01) unless overpay on cash
      if (tendered - total > 0.01 && cardAmount > total) {
        throw new Error("Split amounts must roughly equal the total");
      }
      cashReceived = cashAmount;
      change = tendered > total ? Number((tendered - total).toFixed(2)) : 0;
    } else if (input.paymentMethod === "cash") {
      cashReceived = Number(input.cashReceived) || 0;
      if (cashReceived < total) {
        throw new Error("Cash received is less than the total");
      }
      change = cashReceived - total;
      cashAmount = cashReceived;
    } else if (input.paymentMethod === "card") {
      cardAmount = total;
    }

    const saleStatus = input.status ?? "completed";

    const sale = await persistSale({
      lines,
      subtotal,
      discountTotal,
      finalDiscount,
      serviceCharge,
      total,
      paymentMethod: input.paymentMethod,
      isWholesale: input.paymentMethod === "wholesale" || !!input.isWholesale,
      customerName: input.customerName?.trim() || null,
      customerMobile: input.customerMobile?.trim() || null,
      employee: input.employee?.trim() || null,
      cashReceived,
      change,
      status: saleStatus,
      cashAmount,
      cardAmount,
      source: input.source ?? "POS",
      fulfillmentStatus: input.fulfillmentStatus,
      paymentStatus: input.paymentStatus,
      deliveryAddress: input.deliveryAddress ?? null,
      deliveryFee: input.deliveryFee ?? 0,
      codFee: input.codFee ?? 0,
    });

    // Pending card sales must NOT hit the register or imply paid inventory movement.
    if (saleStatus === "pending") {
      await writeAudit({
        actor: input.employee?.trim() || "storefront",
        action: "sale.pending",
        entity: "sale",
        entityId: sale.id,
        detail: "Awaiting gateway webhook",
      });
      return sale;
    }

    try {
      const { recordSaleOnShift } = await import("@/lib/server/register-store");
      const emp = input.employee?.trim() || "";
      const isTraining = emp.startsWith("[TRAINING]");
      if (!isTraining) {
        await recordSaleOnShift({
          id: sale.id,
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          cashReceived: sale.cashReceived,
        });
      }
    } catch {
      // Non-fatal if no open shift.
    }

    try {
      const { logFiscalEvent } = await import("@/lib/server/fiscal-stub");
      await logFiscalEvent({
        id: sale.id,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        employee: input.employee,
      });
    } catch {
      // Non-fatal fiscal stub
    }

    await writeAudit({
      actor: input.employee?.trim() || "cashier",
      action: "sale.create",
      entity: "sale",
      entityId: sale.id,
      detail: `${sale.paymentMethod} · ${sale.total}`,
    });

    try {
      const { decrementVariantStock } = await import("@/lib/server/variants-repo");
      const { parseCommerceLineId } = await import("@/lib/commerce/line-ids");
      for (const line of input.lines) {
        const parsed = parseCommerceLineId(line.productId);
        const variantId = line.variantId ?? parsed.variantId;
        if (variantId) await decrementVariantStock(variantId, line.quantity);
      }
    } catch {
      // Demo variant stock is best-effort.
    }

    return sale;
  }
}
