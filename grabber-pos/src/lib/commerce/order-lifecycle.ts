import type { FulfillmentStatus } from "./schema";

export const FULFILLMENT_FLOW: {
  id: FulfillmentStatus;
  label: string;
  kind: "delivery" | "pickup" | "both";
}[] = [
  { id: "pending", label: "Confirmed", kind: "both" },
  { id: "processing", label: "Processing", kind: "both" },
  { id: "ready", label: "Ready", kind: "both" },
  { id: "shipped", label: "Out for delivery", kind: "delivery" },
  { id: "delivered", label: "Delivered", kind: "delivery" },
  { id: "collected", label: "Collected", kind: "pickup" },
  { id: "cancelled", label: "Cancelled", kind: "both" },
];

const NEXT: Record<string, FulfillmentStatus[]> = {
  pending: ["processing", "ready", "cancelled"],
  processing: ["ready", "cancelled"],
  ready: ["shipped", "collected", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  collected: [],
  cancelled: [],
};

export function allowedFulfillmentNext(
  current: string | null | undefined,
  fulfilment?: "pickup" | "delivery" | string,
): FulfillmentStatus[] {
  const from = (current || "pending") as FulfillmentStatus;
  const options = NEXT[from] ?? [];
  if (fulfilment === "pickup") {
    return options.filter((s) => s !== "shipped" && s !== "delivered");
  }
  if (fulfilment && fulfilment !== "pickup") {
    return options.filter((s) => s !== "collected");
  }
  return options;
}

export function fulfillmentLabel(status: string | null | undefined): string {
  return FULFILLMENT_FLOW.find((s) => s.id === status)?.label ?? status ?? "Pending";
}
