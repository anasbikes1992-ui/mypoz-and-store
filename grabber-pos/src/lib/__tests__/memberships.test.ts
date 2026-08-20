import { describe, expect, it } from "vitest";
import { activeMemberDiscount } from "@/lib/memberships";

describe("activeMemberDiscount", () => {
  it("returns best active percent for customer", () => {
    const pct = activeMemberDiscount(
      [
        {
          customerId: "c1",
          status: "active",
          memberPricePercent: 5,
          startDate: "2020-01-01",
          endDate: "2099-01-01",
        },
        {
          customerId: "c1",
          status: "active",
          memberPricePercent: 12,
          startDate: "2020-01-01",
          endDate: "2099-01-01",
        },
        {
          customerId: "c2",
          status: "active",
          memberPricePercent: 50,
        },
      ],
      "c1",
      new Date("2026-06-01"),
    );
    expect(pct).toBe(12);
  });

  it("ignores paused/expired/out-of-window", () => {
    expect(
      activeMemberDiscount(
        [{ customerId: "c1", status: "paused", memberPricePercent: 20 }],
        "c1",
      ),
    ).toBeNull();
    expect(
      activeMemberDiscount(
        [
          {
            customerId: "c1",
            status: "active",
            memberPricePercent: 20,
            endDate: "2020-01-01",
          },
        ],
        "c1",
        new Date("2026-01-01"),
      ),
    ).toBeNull();
  });
});
