import { notFound } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { listStorefrontWebOrders } from "@/lib/server/storefront-orders-store";
import { formatMoney, formatDateTime } from "@/lib/format";
import { FulfillmentActions } from "@/components/commerce/admin/FulfillmentActions";

export default async function CommerceOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orders = await listStorefrontWebOrders();
  const order = orders.find((o) => o.id === id || o.receiptNo === id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title={`Order ${order.receiptNo}`}
        subtitle={formatDateTime(order.createdAt)}
        actions={
          <Link href="/commerce/orders" className="text-sm font-semibold text-accent">
            ← All orders
          </Link>
        }
      />
      <div className="mt-4">
        <CommerceNav />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-semibold">Customer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-text-dim">Name</dt>
              <dd className="font-medium">{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-text-dim">Mobile</dt>
              <dd>{order.customerMobile}</dd>
            </div>
            {order.customerEmail && (
              <div>
                <dt className="text-text-dim">Email</dt>
                <dd>{order.customerEmail}</dd>
              </div>
            )}
            <div>
              <dt className="text-text-dim">Address</dt>
              <dd className="whitespace-pre-wrap">{order.address}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-line bg-surface-1 p-5">
          <h2 className="text-sm font-semibold">Status</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-dim">Source</dt>
              <dd>{order.source ?? "ONLINE_STORE"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-dim">Payment</dt>
              <dd>
                {order.paymentMethod}
                {order.pendingPayment ? " (awaiting gateway)" : ""}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-dim">Fulfilment</dt>
              <dd>{order.fulfilment}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-dim">Fulfillment status</dt>
              <dd>{order.fulfillmentStatus ?? "pending"}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-line pt-4">
            <FulfillmentActions
              orderId={order.id}
              current={order.fulfillmentStatus ?? "pending"}
              fulfilment={order.fulfilment}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-surface-1 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Items</h2>
          <ul className="mt-3 divide-y divide-line">
            {order.lines.map((l) => (
              <li key={l.productId} className="flex justify-between py-2 text-sm">
                <span>
                  {l.name} × {l.quantity}
                </span>
                <span className="tabular-nums">{formatMoney(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            {(order.deliveryFee ?? 0) > 0 && (
              <div className="flex justify-between">
                <dt className="text-text-dim">Delivery</dt>
                <dd className="tabular-nums">{formatMoney(order.deliveryFee!)}</dd>
              </div>
            )}
            {(order.codFee ?? 0) > 0 && (
              <div className="flex justify-between">
                <dt className="text-text-dim">COD fee</dt>
                <dd className="tabular-nums">{formatMoney(order.codFee!)}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
