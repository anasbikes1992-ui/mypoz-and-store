import { describe, expect, it } from "vitest";
import { kpiById, kpiCatalog, KPI_CANON } from "@/lib/kpi/canon";

describe("KPI canon", () => {
  it("exposes shared metric ids", () => {
    expect(KPI_CANON.length).toBeGreaterThanOrEqual(8);
    expect(kpiById("sales_today")?.label).toMatch(/today/i);
    expect(kpiCatalog().some((k) => k.id === "low_stock")).toBe(true);
  });
});
