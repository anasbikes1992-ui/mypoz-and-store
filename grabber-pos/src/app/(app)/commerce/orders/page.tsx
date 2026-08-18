import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { listStorefrontWebOrders } from "@/lib/server/storefront-orders-store";
import { formatMoney, formatDateTime } from "@/lib/format";
import Link from "next/link";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "ready", label: "Ready" },
  { id: "paid-pending", label: "Awaiting payment" },
] as const;

export default async function CommerceOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const orders = await listStorefrontWebOrders();

  const filtered = orders.filter((o) => {
    if (status === "pending") return o.fulfillmentStatus === "pending" && !o.pendingPayment;
    if (status === "ready") return o.fulfillmentStatus === "ready";
    if (status === "paid-pending") return o.pendingPayment;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Online orders"
        subtitle="Same sales ledger as POS — source ONLINE_STORE, shared inventory."
        actions={
          <Link href="/click-collect" className="text-sm font-semibold text-accent">
            Fulfilment boards
          </Link>
        }
      />
      <div className="mt-4">
        <CommerceNav />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id === "all" ? "/commerce/orders" : `/commerce/orders?status=${f.id}`}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === f.id
                ? "bg-accent text-accent-ink"
                : "border border-line text-text-dim"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 rounded-3xl border border-dashed border-line px-4 py-16 text-center text-sm text-text-dim">
          No online orders yet.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wider text-text-dim">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Pay</th>
                <th className="px-4 py-3">Fulfil</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link
                      href={`/commerce/orders/${o.id}`}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {o.receiptNo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.customerName}</p>
                    <p className="text-xs text-text-dim">{o.customerMobile}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{o.source ?? "ONLINE_STORE"}</td>
                  <td className="px-4 py-3">
                    {o.paymentMethod}
                    {o.pendingPayment ? " (pending)" : ""}
                  </td>
                  <td className="px-4 py-3">
                    {o.fulfillmentStatus ?? o.fulfilment}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(o.total)}
                    {(o.deliveryFee ?? 0) > 0 && (
                      <span className="block text-xs text-text-dim">
                        incl. delivery {formatMoney(o.deliveryFee!)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-dim">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
