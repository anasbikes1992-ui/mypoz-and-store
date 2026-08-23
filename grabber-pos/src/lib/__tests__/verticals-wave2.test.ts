import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  defaultDueAt,
  isJobOverdue,
  jobNotifyMessage,
} from "@/lib/job-math";
import {
  hpNextDueAt,
  hpOverdueDays,
  parseCsvList,
} from "@/lib/hp-math";
import {
  buildHpAlerts,
  buildJobAlerts,
} from "@/lib/operational-alerts";

describe("job SLA", () => {
  it("computes default due date from SLA days", () => {
    const due = defaultDueAt("2026-08-01T00:00:00.000Z", 3);
    expect(due.slice(0, 10)).toBe("2026-08-04");
  });

  it("flags overdue jobs", () => {
    const due = "2020-01-01T00:00:00.000Z";
    expect(isJobOverdue(due, "diagnose")).toBe(true);
    expect(isJobOverdue(due, "ready")).toBe(false);
    expect(daysUntilDue(due, Date.parse("2020-01-10"))).toBe(-9);
  });

  it("builds WhatsApp notify text", () => {
    const msg = jobNotifyMessage({
      businessName: "Test Shop",
      jobId: "RJ-abc",
      customer: "Sam",
      subject: "iPhone 12",
      status: "ready",
      type: "repair",
    });
    expect(msg).toContain("Sam");
    expect(msg).toContain("ready");
  });
});

describe("hire purchase schedule", () => {
  it("computes next due and overdue days", () => {
    const next = hpNextDueAt(
      {
        createdAt: "2026-01-15T00:00:00.000Z",
        status: "active",
        payments: [],
        balance: 5000,
      },
      5,
    );
    expect(next).toBeTruthy();
    const overdue = hpOverdueDays(next, Date.parse("2026-03-10"));
    expect(overdue).toBeGreaterThan(0);
  });

  it("parses CSV provider lists", () => {
    expect(parseCsvList("Dialog, Mobitel ,Hutch")).toEqual([
      "Dialog",
      "Mobitel",
      "Hutch",
    ]);
  });
});

describe("operational alerts", () => {
  it("builds HP overdue alerts", () => {
    const alerts = buildHpAlerts(
      [
        {
          id: "HP-1",
          customer: "A",
          item: "Fridge",
          status: "active",
          payments: [],
          balance: 1000,
          createdAt: "2020-01-01T00:00:00.000Z",
        },
      ],
      1,
    );
    expect(alerts.length).toBe(1);
    expect(alerts[0].kind).toBe("hp-overdue");
  });

  it("builds job overdue alerts", () => {
    const alerts = buildJobAlerts([
      {
        id: "RJ-1",
        customer: "B",
        subject: "Laptop",
        status: "diagnose",
        dueAt: "2020-01-01T00:00:00.000Z",
      },
    ]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].kind).toBe("job-overdue");
  });
});
