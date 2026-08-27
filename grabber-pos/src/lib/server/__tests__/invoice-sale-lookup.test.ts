import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("invoice + whatsapp sale routes", () => {
  it("use tenant session and repository lookup (not raw sales-repo fallback)", () => {
    for (const rel of ["sales/[id]/invoice/route.ts", "sales/[id]/whatsapp/route.ts"]) {
      const text = fs.readFileSync(
        path.join(process.cwd(), "src/app/api", rel),
        "utf8",
      );
      expect(text).toContain("requireTenantSession");
      expect(text).toContain("getRepository");
      expect(text).toContain("findSaleById");
      expect(text).not.toMatch(/from "@\/lib\/server\/sales-repo"/);
    }
  });

  it("repository exposes tenant-scoped findSaleById", () => {
    const types = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/repositories/types.ts"),
      "utf8",
    );
    const supabase = fs.readFileSync(
      path.join(process.cwd(), "src/lib/server/repositories/supabase.ts"),
      "utf8",
    );
    expect(types).toContain("findSaleById(id: string)");
    expect(supabase).toContain("async findSaleById(id: string)");
    expect(supabase).toContain(".eq(\"receipt_no\", key)");
  });
});

describe("POS success modal invoice link", () => {
  it("prefers receipt number in invoice URL", () => {
    const text = fs.readFileSync(
      path.join(process.cwd(), "src/components/pos/BillPanel.tsx"),
      "utf8",
    );
    expect(text).toContain(
      "encodeURIComponent(done.receiptNo || done.id)",
    );
    expect(text).toContain(
      "encodeURIComponent(sale.receiptNo || sale.id)",
    );
  });
});
