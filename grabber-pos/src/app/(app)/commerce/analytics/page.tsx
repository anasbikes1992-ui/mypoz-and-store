import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { listCommerceEvents, summarizeFunnel } from "@/lib/server/commerce-analytics-store";
import { readPublishedStore } from "@/lib/server/commerce-store";
import { formatMoney } from "@/lib/format";

export default async function CommerceAnalyticsPage() {
  const store = await readPublishedStore();
  const events = await listCommerceEvents(store.slug);
  const funnel = summarizeFunnel(events);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader title="Analytics" subtitle="Storefront funnel. Checkout revalidates stock and price — this is traffic, not inventory." />
      <div className="mt-4"><CommerceNav /></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Visitors" value={String(funnel.visitors)} />
        <Stat label="Purchases" value={String(funnel.purchases)} />
        <Stat label="Conversion" value={`${(funnel.conversionRate * 100).toFixed(1)}%`} />
        <Stat label="Revenue" value={formatMoney(funnel.revenue)} />
      </div>
      <ol className="mt-6 space-y-2 rounded-3xl border border-line bg-surface-1 p-5 text-sm">
        <li>Visitors → {funnel.visitors}</li>
        <li>Product views → {funnel.productViews}</li>
        <li>Add to cart → {funnel.addToCart}</li>
        <li>Checkout → {funnel.checkoutStarted}</li>
        <li>Purchase → {funnel.purchases}</li>
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-1 p-4">
      <p className="text-xs text-text-dim">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
