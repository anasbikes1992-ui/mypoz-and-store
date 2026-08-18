import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { readDraftStore, readPublishedStore, readCommerce } from "@/lib/server/commerce-store";
import { listStorefrontWebOrders } from "@/lib/server/storefront-orders-store";
import { listCommerceEvents, summarizeFunnel } from "@/lib/server/commerce-analytics-store";
import { getStorefrontCatalog } from "@/lib/server/storefront-repo";
import { formatMoney } from "@/lib/format";
import Link from "next/link";
import { THEMES } from "@/lib/commerce/themes";
import { storePath } from "@/lib/commerce/schema";

export default async function CommerceOverviewPage() {
  const [draft, published, doc, orders, events] = await Promise.all([
    readDraftStore(),
    readPublishedStore(),
    readCommerce(),
    listStorefrontWebOrders(),
    listCommerceEvents(),
  ]);
  const slug = published.slug || draft.slug || "main-store";
  const catalog = await getStorefrontCatalog({ host: null, slug }, { size: 24 });
  const funnel = summarizeFunnel(events.filter((e) => e.slug === slug));
  const todayOrders = orders.filter(
    (o) => o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10),
  );
  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  const lowStock = catalog.items.filter((p) => p.stock > 0 && p.stock <= 5).slice(0, 6);
  const live = published.status === "published" && !!doc.published;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Online store"
        subtitle="POS and storefront share the same products, stock, customers, and orders."
        actions={
          <>
            <Link
              href="/commerce/onboarding"
              className="inline-flex min-h-10 items-center rounded-2xl border border-line px-4 text-sm font-semibold text-text-strong"
            >
              Launch store
            </Link>
            <Link
              href={storePath(slug)}
              className="inline-flex min-h-10 items-center rounded-2xl bg-accent px-4 text-sm font-semibold text-accent-ink"
            >
              Open store
            </Link>
          </>
        }
      />
      <div className="mt-4">
        <CommerceNav />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today's online sales" value={formatMoney(todaySales || funnel.todayRevenue)} />
        <Stat label="Online orders today" value={String(todayOrders.length || funnel.todayPurchases)} />
        <Stat label="Catalog products" value={String(catalog.total)} />
        <Stat
          label="Store status"
          value={live ? "Published" : "Draft"}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-line bg-surface-1 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text-strong">Recent online orders</h2>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-text-dim">No online orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {orders.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-strong">
                      {o.receiptNo} · {o.customerName}
                    </p>
                    <p className="text-xs text-text-dim">
                      {o.fulfilment} · {o.paymentMethod}
                      {o.pendingPayment ? " · awaiting payment" : ""}
                    </p>
                  </div>
                  <p className="tabular-nums font-semibold">{formatMoney(o.total)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/commerce/orders" className="mt-3 inline-block text-xs font-semibold text-accent">
            View all orders
          </Link>
        </section>
        <section className="rounded-3xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-semibold text-text-strong">Store</h2>
          <p className="mt-2 text-lg font-semibold text-text-strong">{draft.name}</p>
          <p className="text-sm text-text-dim">{THEMES[draft.themeId].name} theme</p>
          <p className="mt-2 text-xs text-text-dim">
            {doc.publishedAt
              ? `Last published ${new Date(doc.publishedAt).toLocaleString("en-GB")}`
              : "Not published yet — save a draft and click Publish."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/commerce/builder"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-accent-ink"
            >
              Customize store
            </Link>
            <Link
              href="/commerce/themes"
              className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-line text-sm font-semibold"
            >
              Change theme
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-semibold text-text-strong">Funnel</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>Visitors</span><span>{funnel.visitors}</span></li>
            <li className="flex justify-between"><span>Product views</span><span>{funnel.productViews}</span></li>
            <li className="flex justify-between"><span>Add to cart</span><span>{funnel.addToCart}</span></li>
            <li className="flex justify-between"><span>Checkout</span><span>{funnel.checkoutStarted}</span></li>
            <li className="flex justify-between"><span>Purchase</span><span>{funnel.purchases}</span></li>
          </ul>
        </section>
        <section className="rounded-3xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-semibold text-text-strong">Low stock (online)</h2>
          {lowStock.length === 0 ? (
            <p className="mt-6 text-sm text-text-dim">No low-stock online products.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="tabular-nums text-text-dim">{p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-1 p-4">
      <p className="text-xs font-medium text-text-dim">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-text-strong">{value}</p>
    </div>
  );
}
