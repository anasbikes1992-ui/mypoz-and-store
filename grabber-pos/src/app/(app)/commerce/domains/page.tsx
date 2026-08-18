import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { DomainForm } from "@/components/commerce/admin/DomainForm";
import { readDraftStore } from "@/lib/server/commerce-store";

export default async function CommerceDomainsPage() {
  const store = await readDraftStore();
  const host = store.subdomain || `${store.slug}.mypoz.lk`;
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader
        title="Domains"
        subtitle="Every merchant gets a MyPoz subdomain. Custom domains activate only after DNS verifies."
      />
      <div className="mt-4"><CommerceNav /></div>
      <section className="mt-6 rounded-3xl border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-semibold">MyPoz subdomain</h2>
        <p className="mt-2 font-mono text-sm text-accent">{host}</p>
        <p className="mt-2 text-sm text-text-dim">
          Preview path on this app: <span className="font-mono">/store/{store.slug}</span>
        </p>
      </section>
      <DomainForm initial={store} />
    </div>
  );
}
