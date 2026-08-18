import { ModuleHeader } from "@/components/shell/ModuleHeader";
import { CommerceNav } from "@/components/commerce/admin/CommerceNav";
import { readDraftStore } from "@/lib/server/commerce-store";
import Link from "next/link";

export default async function CommercePagesPage() {
  const store = await readDraftStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <ModuleHeader title="Pages" subtitle="Home is edited in the Store builder. Legal pages ship with defaults." />
      <div className="mt-4"><CommerceNav /></div>
      <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface-1">
        {store.pages.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-text-strong">{p.title}</p>
              <p className="text-xs text-text-dim">/{p.slug} · {p.sections.length} sections</p>
            </div>
            {p.type === "home" ? (
              <Link href="/commerce/builder" className="text-sm font-semibold text-accent">
                Edit
              </Link>
            ) : (
              <span className="text-xs text-text-dim">{p.visible ? "Visible" : "Hidden"}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
