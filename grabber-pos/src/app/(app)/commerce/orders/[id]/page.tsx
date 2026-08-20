import { notFound } from "next/navigation";
import Link from "next/link";
import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { listStorefrontWebOrders } from "@/lib/server/storefront-orders-store";
import { formatMoney, formatDateTime } from "@/lib/format";
import { FulfillmentActions } from "@/components/commerce/admin/FulfillmentActions";
import { PaymentProofActions } from "@/components/commerce/admin/PaymentProofActions";

export default async function CommerceOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orders = await listStorefrontWebOrders();
  const order = orders.find(
    (o) => o.id === id || o.receiptNo === id || o.saleId === id,
  );
  if (!order) notFound();

  const boardHref =
    order.boardId && order.boardKind === "delivery"
      ? `/delivery/${order.boardId}`
      : order.boardId && order.boardKind === "click-collect"
        ? `/click-collect`
        : null;

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
            <div className="flex justify-between gap-3">
              <dt className="text-text-dim">Receipt</dt>
              <dd className="font-mono text-xs">{order.receiptNo}</dd>
            </div>
            {order.saleId ? (
              <div className="flex justify-between gap-3">
                <dt className="text-text-dim">Sale ID</dt>
                <dd className="break-all font-mono text-xs">{order.saleId}</dd>
              </div>
            ) : null}
            {order.boardId ? (
              <div className="flex justify-between gap-3">
                <dt className="text-text-dim">Board</dt>
                <dd className="text-right">
                  {boardHref ? (
                    <Link
                      href={boardHref}
                      className="font-mono text-xs text-accent hover:underline"
                    >
                      {order.boardId}
                      {order.boardKind ? ` · ${order.boardKind}` : ""}
                    </Link>
                  ) : (
                    <span className="font-mono text-xs">{order.boardId}</span>
                  )}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-text-dim">Source</dt>
              <dd>{order.source ?? "ONLINE_STORE"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-dim">Payment</dt>
              <dd>
                {order.paymentMethod}
                {order.pendingPayment ? " (awaiting gateway)" : ""}
                {order.paymentProofStatus && order.paymentProofStatus !== "none"
                  ? ` · proof ${order.paymentProofStatus}`
                  : ""}
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
          {order.paymentMethod === "bank_transfer" ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-semibold">Bank transfer proof</h3>
              <PaymentProofActions
                orderId={order.id}
                status={order.paymentProofStatus}
                proofUrl={order.paymentProofUrl}
                note={order.paymentProofNote}
              />
            </div>
          ) : null}
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
