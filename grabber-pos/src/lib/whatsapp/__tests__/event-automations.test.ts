import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENABLED_EVENTS,
  eventFromFulfillmentStatus,
  normalizeEnabledEvents,
  templateForEvent,
  WA_EVENT_KEYS,
} from "@/lib/whatsapp/event-automations";

describe("WhatsApp event automations", () => {
  it("defines ten canonical events", () => {
    expect(WA_EVENT_KEYS).toHaveLength(10);
    expect(Object.keys(DEFAULT_ENABLED_EVENTS)).toHaveLength(10);
  });

  it("maps fulfillment statuses", () => {
    expect(eventFromFulfillmentStatus("ready")).toBe("ORDER_READY");
    expect(eventFromFulfillmentStatus("completed")).toBe("ORDER_COMPLETED");
    expect(eventFromFulfillmentStatus("cancelled")).toBe("ORDER_CANCELLED");
    expect(eventFromFulfillmentStatus("bogus")).toBeNull();
  });

  it("templates include STOP on order created", () => {
    const body = templateForEvent("ORDER_CREATED", {
      receipt: "R-1",
      total: "Rs 100",
      customerName: "A",
    });
    expect(body).toContain("R-1");
    expect(body.toUpperCase()).toContain("STOP");
  });

  it("normalizes partial enabledEvents", () => {
    const next = normalizeEnabledEvents({ SALE_COMPLETED: true });
    expect(next.SALE_COMPLETED).toBe(true);
    expect(next.ORDER_CREATED).toBe(true);
  });
});
