import { describe, expect, it } from "vitest";
import { mobilesMatch, normalizeCustomerMobile } from "@/lib/commerce/customer-mobile";
import {
  aggregateChannels,
  buildCustomerTimeline,
  filterSalesForCustomer,
} from "@/lib/commerce/customer-profile-aggregate";
import type { Sale } from "@/lib/types";

function sale(partial: Partial<Sale> & Pick<Sale, "id" | "total">): Sale {
  return {
    createdAt: "2026-08-01T10:00:00.000Z",
    lines: [],
    subtotal: partial.total,
    discountTotal: 0,
    finalDiscount: 0,
    serviceCharge: 0,
    paymentMethod: "cash",
    isWholesale: false,
    customerName: "Test",
    customerMobile: "0771234567",
    employee: null,
    cashReceived: null,
    change: null,
    status: "completed",
    ...partial,
  };
}

describe("customer-mobile", () => {
  it("normalizes local SL numbers to E.164", () => {
    expect(normalizeCustomerMobile("077 123 4567")).toBe("94771234567");
    expect(normalizeCustomerMobile("94771234567")).toBe("94771234567");
  });

  it("matches mobiles across formatting", () => {
    expect(mobilesMatch("0771234567", "+94 77 123 4567")).toBe(true);
    expect(mobilesMatch("0771234567", "0719999999")).toBe(false);
  });
});

describe("customer-profile aggregation", () => {
  const sales: Sale[] = [
    sale({
      id: "s1",
      total: 1000,
      source: "POS",
      customerMobile: "0771234567",
    }),
    sale({
      id: "s2",
      total: 2500,
      source: "ONLINE_STORE",
      customerMobile: "+94771234567",
    }),
    sale({
      id: "s3",
      total: 500,
      source: "WHATSAPP",
      customerMobile: "0711111111",
      status: "voided",
    }),
  ];

  it("filters sales by normalized mobile", () => {
    const matched = filterSalesForCustomer(sales, "0771234567");
    expect(matched.map((s) => s.id).sort()).toEqual(["s1", "s2"]);
  });

  it("aggregates channel revenue excluding voided", () => {
    const matched = filterSalesForCustomer(sales, "0771234567");
    const channels = aggregateChannels(matched);
    expect(channels).toHaveLength(2);
    const pos = channels.find((c) => c.source === "POS");
    const online = channels.find((c) => c.source === "ONLINE_STORE");
    expect(pos?.orderCount).toBe(1);
    expect(pos?.revenue).toBe(1000);
    expect(online?.revenue).toBe(2500);
  });

  it("builds merged timeline sorted newest first", () => {
    const profileSales = [
      {
        id: "s1",
        receiptNo: "GPS-1",
        total: 1000,
        source: "POS" as const,
        createdAt: "2026-08-02T12:00:00.000Z",
        paymentMethod: "cash",
      },
    ];
    const timeline = buildCustomerTimeline(profileSales, [
      {
        id: "L1",
        kind: "earn",
        points: 10,
        note: "Sale",
        createdAt: "2026-08-03T09:00:00.000Z",
      },
    ]);
    expect(timeline[0].type).toBe("loyalty");
    expect(timeline[1].type).toBe("sale");
  });
});

describe("customer profile API", () => {
  it("route uses tenant session and profile builder", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const text = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/customers/[id]/profile/route.ts"),
      "utf8",
    );
    expect(text).toContain("requireTenantSession");
    expect(text).toContain("buildCustomerProfile");
  });
});
