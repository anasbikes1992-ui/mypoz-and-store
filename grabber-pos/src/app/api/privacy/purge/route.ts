import { NextRequest, NextResponse } from "next/server";
import {
  dataFile,
  readJsonFile,
  writeJsonFile,
  withFileLock,
} from "@/lib/server/persistence/local-json";
import { listCollection, updateEntity } from "@/lib/server/collection-store";
import { writeAudit } from "@/lib/server/audit-store";
import type { Sale } from "@/lib/types";

const SALES_FILE = dataFile("sales.json");

export async function POST(req: NextRequest) {
  let days = 365;
  try {
    const body = await req.json();
    days = Math.max(1, Number(body.days) || 365);
  } catch {
    // default
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let salesTouched = 0;
  let customersTouched = 0;

  await withFileLock(SALES_FILE, async () => {
    const sales = await readJsonFile<Sale[]>(SALES_FILE, []);
    const next = sales.map((s) => {
      const t = new Date(s.createdAt).getTime();
      if (Number.isNaN(t) || t > cutoff) return s;
      if (!s.customerName && !s.customerMobile) return s;
      salesTouched += 1;
      return { ...s, customerName: null, customerMobile: null };
    });
    await writeJsonFile(SALES_FILE, next);
  });

  try {
    const customers = await listCollection("customers");
    for (const c of customers) {
      const created = new Date(String(c.createdAt ?? "")).getTime();
      if (Number.isNaN(created) || created > cutoff) continue;
      const name = String(c.name ?? "");
      const mobile = String(c.mobile ?? "");
      if (!name && !mobile) continue;
      await updateEntity("customers", c.id, {
        ...c,
        name: name ? "[redacted]" : name,
        mobile: "",
        email: "",
        address: "",
      });
      customersTouched += 1;
    }
  } catch {
    // Collection may be empty / unavailable
  }

  await writeAudit({
    actor: "admin",
    action: "privacy.purge",
    entity: "privacy",
    entityId: `days-${days}`,
    detail: `sales=${salesTouched} customers=${customersTouched}`,
  });

  return NextResponse.json({
    success: true,
    data: { sales: salesTouched, customers: customersTouched, days },
    error: null,
  });
}
