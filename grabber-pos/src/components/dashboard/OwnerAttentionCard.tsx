import Link from "next/link";
import type { OwnerAttentionSnapshot } from "@/lib/server/owner-attention";

export function OwnerAttentionCard({
  snapshot,
}: {
  snapshot: OwnerAttentionSnapshot;
}) {
  if (snapshot.total === 0) {
    return (
      <section className="rounded-2xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-text-strong">Needs attention</h2>
        <p className="mt-2 text-sm text-text-dim">
          No open exceptions — orders, stock, and WhatsApp look clear.
        </p>
      </section>
    );
  }

  const items: { label: string; count: number; href: string }[] = [];
  if (snapshot.unfulfilledOrders > 0) {
    items.push({
      label: "Orders to fulfill",
      count: snapshot.unfulfilledOrders,
      href: "/commerce/orders",
    });
  }
  if (snapshot.whatsappNeedsReply > 0) {
    items.push({
      label: "WhatsApp needs reply",
      count: snapshot.whatsappNeedsReply,
      href: "/whatsapp",
    });
  }
  if (snapshot.lowStock > 0) {
    items.push({
      label: "Low stock SKUs",
      count: snapshot.lowStock,
      href: "/inventory",
    });
  }
  if (snapshot.expired > 0) {
    items.push({
      label: "Expired batches",
      count: snapshot.expired,
      href: "/inventory",
    });
  }

  return (
    <section className="rounded-2xl border border-warn/40 bg-surface-1 p-5">
      <h2 className="text-sm font-semibold text-text-strong">Needs attention</h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface-2"
            >
              <span className="text-text-body">{item.label}</span>
              <span className="font-semibold text-warn">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
