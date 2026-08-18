import { getRepository } from "@/lib/server/repositories";
import { formatMoney, formatDateTime } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { ModuleHeader } from "@/components/shell/ModuleHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repo = await getRepository();
  const [inv, sales, recent] = await Promise.all([
    repo.inventoryStats(),
    repo.salesStats(),
    repo.listSales(8),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ModuleHeader title="Dashboard" subtitle="Live overview of sales and stock" />

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Today's revenue"
          value={formatMoney(sales.todayRevenue)}
          hint={`${sales.todayCount} sales today`}
        />
        <StatCard
          index={1}
          label="Total revenue"
          value={formatMoney(sales.totalRevenue)}
          hint={`${sales.totalCount} sales all-time`}
          tone="info"
        />
        <StatCard
          index={2}
          label="Stock value (cost)"
          value={formatMoney(inv.stockValue)}
          hint={`${inv.productCount.toLocaleString()} products`}
          tone="accent"
        />
        <StatCard
          index={3}
          label="Attention needed"
          value={`${inv.lowStock} low`}
          hint={`${inv.expired} expired items`}
          tone={inv.expired > 0 ? "danger" : "warn"}
        />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium tracking-tight text-text-strong">Recent sales</h2>
        {recent.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-1/40 px-6 py-10 text-center">
            <p className="font-medium text-text-strong">No sales yet</p>
            <p className="mt-1 text-sm text-text-dim">
              Open a sale mode to post the first bill.
            </p>
            <a
              href="/pos"
              className="mt-5 inline-flex rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition hover:bg-accent-strong"
            >
              Open retail terminal
            </a>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-1">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-5 py-3.5 text-sm"
              >
                <div>
                  <p className="font-medium text-text-strong">{s.id}</p>
                  <p className="text-xs text-text-dim">
                    {formatDateTime(s.createdAt)} · {s.lines.length} items ·{" "}
                    {s.paymentMethod}
                  </p>
                </div>
                <p className="font-semibold text-accent">
                  {formatMoney(s.total)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
