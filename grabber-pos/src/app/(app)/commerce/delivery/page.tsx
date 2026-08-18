import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { readDraftStore } from "@/lib/server/commerce-store";
import { formatMoney } from "@/lib/format";

export default async function CommerceDeliveryPage() {
  const store = await readDraftStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader title="Delivery" subtitle="Pickup, local, and islandwide — calculated again at checkout." />
      <div className="mt-4"><CommerceNav /></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Store pickup" value={store.delivery.pickup ? "On" : "Off"} />
        <Card label="Local delivery" value={store.delivery.localDelivery ? "On" : "Off"} />
        <Card label="Islandwide" value={store.delivery.islandwide ? "On" : "Off"} />
      </div>
      <section className="mt-4 rounded-3xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold">Zones</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {store.delivery.zones.map((z) => (
            <li key={z.id} className="flex justify-between">
              <span>{z.name}</span>
              <span className="tabular-nums">{formatMoney(z.fee)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-text-dim">
          Free delivery above {formatMoney(store.delivery.freeThreshold)}. COD{" "}
          {store.cod.enabled ? "enabled" : "disabled"}
          {store.cod.fee ? ` · fee ${formatMoney(store.cod.fee)}` : ""}.
        </p>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface-1 p-4">
      <p className="text-xs text-text-dim">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
