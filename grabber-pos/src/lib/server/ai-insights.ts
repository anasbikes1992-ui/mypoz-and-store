import "server-only";
import { getRepository } from "@/lib/server/repositories";
import type { Sale } from "@/lib/types";

const CHANNELS = ["POS", "ONLINE_STORE", "WHATSAPP", "PHONE", "OTHER"] as const;

function sinceDays(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - Math.max(1, Math.min(days, 365)));
  return d;
}

function completed(sales: Sale[]): Sale[] {
  return sales.filter((s) => (s.status ?? "completed") === "completed");
}

function inPeriod(sales: Sale[], days: number): Sale[] {
  const from = sinceDays(days).toISOString();
  return sales.filter((s) => s.createdAt >= from);
}

function bySource(sales: Sale[], source?: string): Sale[] {
  if (!source) return sales;
  const s = source.toUpperCase();
  return sales.filter((row) => (row.source ?? "POS") === s);
}

export async function periodSales(days = 7, source?: string) {
  const repo = await getRepository();
  const sales = bySource(inPeriod(completed(await repo.listSales(2000)), days), source);
  const byChannel: Record<string, { count: number; revenue: number }> = {};
  for (const ch of CHANNELS) byChannel[ch] = { count: 0, revenue: 0 };
  let revenue = 0;
  for (const s of sales) {
    revenue += Number(s.total) || 0;
    const ch = s.source ?? "POS";
    const bucket = byChannel[ch] ?? { count: 0, revenue: 0 };
    bucket.count += 1;
    bucket.revenue += Number(s.total) || 0;
    byChannel[ch] = bucket;
  }
  return {
    asOf: new Date().toISOString(),
    days,
    source: source ?? "all",
    count: sales.length,
    revenue,
    byChannel,
    note: sales.length === 0 ? "No completed sales in this window (or empty catalogue)." : undefined,
  };
}

export async function topProducts(days = 30, limit = 10) {
  const repo = await getRepository();
  const sales = inPeriod(completed(await repo.listSales(2000)), days);
  const map = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const s of sales) {
    for (const line of s.lines ?? []) {
      const id = line.productId || line.name;
      const cur = map.get(id) ?? { name: line.name, qty: 0, revenue: 0 };
      cur.qty += Number(line.quantity) || 0;
      cur.revenue += Number(line.lineTotal) || 0;
      map.set(id, cur);
    }
  }
  const top = [...map.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, Math.max(1, Math.min(limit, 25)));
  return { asOf: new Date().toISOString(), days, top };
}

export async function slowMovers(days = 30, limit = 15) {
  const repo = await getRepository();
  const [catalog, sales] = await Promise.all([
    repo.queryProducts({ pageSize: 200 }),
    inPeriod(completed(await repo.listSales(2000)), days),
  ]);
  const sold = new Set<string>();
  for (const s of sales) {
    for (const line of s.lines ?? []) {
      if (line.productId) sold.add(line.productId);
    }
  }
  const slow = catalog.items
    .filter((p) => p.quantity > 0 && !sold.has(p.id))
    .slice(0, Math.max(1, Math.min(limit, 25)))
    .map((p) => ({ name: p.name, quantity: p.quantity, category: p.category }));
  return {
    asOf: new Date().toISOString(),
    days,
    slow,
    note: catalog.total === 0 ? "Catalogue is empty — import products first." : undefined,
  };
}

export async function demandHint() {
  const week = await periodSales(28);
  const daily = week.count ? week.revenue / 28 : 0;
  const next7 = daily * 7;
  return {
    asOf: new Date().toISOString(),
    method: "28-day average × 7 — estimate, not a promise",
    last28Revenue: week.revenue,
    last28Count: week.count,
    hintNext7Revenue: Math.round(next7),
    thinData: week.count < 14,
  };
}
