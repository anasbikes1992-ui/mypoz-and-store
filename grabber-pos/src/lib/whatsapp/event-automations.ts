/**
 * Canonical WhatsApp commerce event automations (v1).
 * Same Supabase + org_id — no separate WA database.
 */
export const WA_EVENT_KEYS = [
  "ORDER_CREATED",
  "ORDER_READY",
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
  ORDER_READY: true,
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
  switch (event) {
    case "ORDER_CREATED":
      return `Thanks${v("customerName") ? ` ${v("customerName")}` : ""}! We received order ${v("receipt", "your order")}. Total ${v("total", "—")}. We'll update you here. Reply STOP to opt out.`;
    case "ORDER_READY":
      return `Order ${v("receipt")} is ready${v("fulfil") === "pickup" ? " for pickup" : ""}. See you soon!`;
    case "ORDER_COMPLETED":
      return `Order ${v("receipt")} is complete. Thank you for shopping with ${v("businessName", "us")}!`;
    case "ORDER_CANCELLED":
      return `Order ${v("receipt")} was cancelled. Reply if you need help placing a new one.`;
    case "PAYMENT_RECEIVED":
      return `Payment received for ${v("receipt")}. Amount ${v("total", "—")}. Thank you!`;
    case "SALE_COMPLETED":
      return `Sale ${v("receipt")} recorded. Total ${v("total", "—")}.`;
    case "REFUND_ISSUED":
      return `Refund processed for ${v("receipt")}${v("total") ? ` (${v("total")})` : ""}.`;
    case "LOW_STOCK":
      return `Low stock alert: ${v("productName", "an item")} is at ${v("qty", "?")} units.`;
    case "STAFF_HANDOFF":
      return `A team member will reply here shortly. Thanks for waiting.`;
    case "OPT_OUT_ACK":
      return `You're opted out of automated WhatsApp updates from ${v("businessName", "this shop")}. Reply START to opt back in.`;
    default:
      return v("message", "Update from your shop.");
  }
}

/** Map fulfillment board statuses → automation events. */
export function eventFromFulfillmentStatus(status: string): WaEventKey | null {
  const s = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (s === "ready" || s === "ready_for_pickup") return "ORDER_READY";
  if (s === "completed" || s === "delivered" || s === "picked_up")
    return "ORDER_COMPLETED";
  if (s === "cancelled" || s === "canceled") return "ORDER_CANCELLED";
  if (s === "paid" || s === "payment_received") return "PAYMENT_RECEIVED";
  return null;
}
