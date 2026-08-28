import { getRepository } from "@/lib/server/repositories";
import { formatMoney, formatMoneyCompact, formatDateTime } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { TodayChannelStrip } from "@/components/dashboard/TodayChannelStrip";
import { OwnerAttentionCard } from "@/components/dashboard/OwnerAttentionCard";
import { JarvisQuickPrompts } from "@/components/dashboard/JarvisQuickPrompts";
import { todayChannelSnapshot } from "@/lib/commerce/channel-report";
import { getOwnerAttentionSnapshot } from "@/lib/server/owner-attention";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repo = await getRepository();
  const [inv, sales, recent, channelSales, attention] = await Promise.all([
    repo.inventoryStats(),
    repo.salesStats(),
    repo.listSales(8),
    repo.listSales(400),
    getOwnerAttentionSnapshot(),
  ]);
  const todayChannels = todayChannelSnapshot(channelSales);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <ModuleHeader title="Dashboard" subtitle="Live overview of sales and stock" />

      <div className="mt-6">
        <TodayChannelStrip snapshot={todayChannels} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <OwnerAttentionCard snapshot={attention} />
        <JarvisQuickPrompts />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Today's revenue"
          value={formatMoneyCompact(sales.todayRevenue)}
          hint={`${sales.todayCount} sales today`}
        />
        <StatCard
          index={1}
          label="Total revenue"
          value={formatMoneyCompact(sales.totalRevenue)}
          hint={`${sales.totalCount} sales all-time`}
          tone="info"
        />
        <StatCard
          index={2}
          label="Stock value (cost)"
          value={inv.stockValue > 0 ? formatMoneyCompact(inv.stockValue) : "—"}
          hint={inv.stockValue > 0
            ? `${inv.productCount.toLocaleString()} products`
            : `${inv.productCount.toLocaleString()} products · add cost prices`}
          tone="accent"
        />
        <StatCard
          index={3}
          label="Attention needed"
          value={inv.expired > 0 ? `${inv.expired} expired` : inv.lowStock > 0 ? `${inv.lowStock} low` : "All good"}
          hint={inv.expired > 0
            ? `${inv.expired} expired · ${inv.lowStock} low stock`
            : inv.lowStock > 0
              ? `${inv.lowStock} of ${inv.productCount} products below 6 units`
              : "Stock levels look healthy"}
          tone={inv.expired > 0 ? "danger" : inv.lowStock > 0 ? "warn" : "accent"}
        />
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="/pos"
          className="rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent"
        >
          <p className="text-xs text-text-dim">Quick action</p>
          <p className="mt-1 text-sm font-semibold text-text-strong">Open retail POS</p>
        </a>
        <a
          href="/products"
          className="rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent"
        >
          <p className="text-xs text-text-dim">Catalog</p>
          <p className="mt-1 text-sm font-semibold text-text-strong">Manage products</p>
        </a>
        <a
          href="/inventory"
          className="rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent"
        >
          <p className="text-xs text-text-dim">Stock</p>
          <p className="mt-1 text-sm font-semibold text-text-strong">Review inventory</p>
        </a>
        <a
          href="/reports"
          className="rounded-2xl border border-line bg-surface-1 p-4 transition hover:border-accent"
        >
          <p className="text-xs text-text-dim">Insights</p>
          <p className="mt-1 text-sm font-semibold text-text-strong">Open reports</p>
        </a>
      </section>

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
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-1">
            {recent.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between px-5 py-4 text-sm"
              >
                <div>
                  <p className="font-mono text-xs text-accent">
                    {s.receiptNo || s.id}
                    {s.source ? ` · ${s.source}` : ""}
                  </p>
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
