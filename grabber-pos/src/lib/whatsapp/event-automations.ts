/**
 * Canonical WhatsApp commerce event automations (v1).
 * Same Supabase + org_id — no separate WA database.
 *
 * These are in-session free-form texts (Cloud API), not Meta HSM templates.
 */
export const WA_EVENT_KEYS = [
  "ORDER_CREATED",
  "ORDER_PROCESSING",
  "ORDER_READY",
  "ORDER_SHIPPED",
  "ORDER_COMPLETED",
  "ORDER_CANCELLED",
  "PAYMENT_RECEIVED",
  "SALE_COMPLETED",
  "REFUND_ISSUED",
  "LOW_STOCK",
  "STAFF_HANDOFF",
  "OPT_OUT_ACK",
] as const;

export type WaEventKey = (typeof WA_EVENT_KEYS)[number];

export type WaEventEnabled = Record<WaEventKey, boolean>;

export const DEFAULT_ENABLED_EVENTS: WaEventEnabled = {
  ORDER_CREATED: true,
  ORDER_PROCESSING: true,
  ORDER_READY: true,
  ORDER_SHIPPED: true,
  ORDER_COMPLETED: true,
  ORDER_CANCELLED: true,
  PAYMENT_RECEIVED: true,
  SALE_COMPLETED: false, // noisy for high-volume POS; owner can enable
  REFUND_ISSUED: true,
  LOW_STOCK: false, // staff-facing; enable per shop
  STAFF_HANDOFF: true,
  OPT_OUT_ACK: true,
};

export function normalizeEnabledEvents(
  raw?: Partial<WaEventEnabled> | null,
): WaEventEnabled {
  const next = { ...DEFAULT_ENABLED_EVENTS };
  if (!raw || typeof raw !== "object") return next;
  for (const key of WA_EVENT_KEYS) {
    if (typeof raw[key] === "boolean") next[key] = raw[key]!;
  }
  return next;
}

export function templateForEvent(
  event: WaEventKey,
  vars: Record<string, string>,
): string {
  const v = (k: string, fallback = "") => String(vars[k] ?? fallback).trim();
  const shop = v("businessName", "us");
  const receipt = v("receipt", "your order");
  switch (event) {
    case "ORDER_CREATED":
      return `Thanks${v("customerName") ? ` ${v("customerName")}` : ""}! ${shop} received order ${receipt}. Total ${v("total", "—")}. We'll update you here as it moves. Reply STOP to opt out.`;
    case "ORDER_PROCESSING":
      return `Order ${receipt} is being prepared at ${shop}. We'll message you when it's ready.`;
    case "ORDER_READY":
      return `Order ${receipt} is ready${v("fulfil") === "pickup" || v("fulfil") === "collected" ? " for pickup" : ""}. See you soon!`;
    case "ORDER_SHIPPED":
      return `Order ${receipt} is out for delivery. Track updates here or reply 5 in the bot menu with your order number.`;
    case "ORDER_COMPLETED":
      return `Order ${receipt} is complete. Thank you for shopping with ${shop}!`;
    case "ORDER_CANCELLED":
      return `Order ${receipt} was cancelled. Reply if you need help placing a new one.`;
    case "PAYMENT_RECEIVED":
      return `Payment received for ${receipt}. Amount ${v("total", "—")}. Thank you!`;
    case "SALE_COMPLETED":
      return `Sale ${receipt} recorded. Total ${v("total", "—")}.`;
    case "REFUND_ISSUED":
      return `Refund processed for ${receipt}${v("total") ? ` (${v("total")})` : ""}.`;
    case "LOW_STOCK":
      return `Low stock alert: ${v("productName", "an item")} is at ${v("qty", "?")} units.`;
    case "STAFF_HANDOFF":
      return `A team member from ${shop} will reply here shortly. Thanks for waiting.`;
    case "OPT_OUT_ACK":
      return `You're opted out of automated WhatsApp updates from ${shop}. Reply START to opt back in.`;
    default:
      return v("message", "Update from your shop.");
  }
}

/** Map fulfillment board statuses → automation events. Returns null = do not ping. */
export function eventFromFulfillmentStatus(status: string): WaEventKey | null {
  const s = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "processing" || s === "preparing" || s === "packing") {
    return "ORDER_PROCESSING";
  }
  if (s === "ready" || s === "ready_for_pickup") return "ORDER_READY";
  if (s === "shipped" || s === "out_for_delivery") return "ORDER_SHIPPED";
  if (
    s === "completed" ||
    s === "delivered" ||
    s === "collected" ||
    s === "picked_up"
  ) {
    return "ORDER_COMPLETED";
  }
  if (s === "cancelled" || s === "canceled") return "ORDER_CANCELLED";
  if (s === "paid" || s === "payment_received") return "PAYMENT_RECEIVED";
  // pending / confirmed already covered by ORDER_CREATED at place-order time
  return null;
}
