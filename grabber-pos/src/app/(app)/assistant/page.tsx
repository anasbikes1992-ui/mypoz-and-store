import Link from "next/link";
import { AgentChat } from "@/components/ai/AgentChat";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold text-text-strong">Jarvis</h1>
      <p className="mt-1 text-sm text-text-dim">
        Shop agents read the same POS catalogue and sales as the till. Drafts
        for knowledge or WhatsApp go to Approvals — agents never write alone.
        Reference tenant for pilots: <strong>Anaz Store</strong> (
        <code className="text-xs">anaz-store</code>).
      </p>
      <AgentChat
        endpoint="/api/ai/chat"
        agents={[
          { id: "owner-retail", name: "Shop retail" },
          { id: "owner-inventory", name: "Inventory coach" },
          { id: "owner-orders", name: "Orders & COD" },
          { id: "owner-storefront", name: "Storefront coach" },
          { id: "owner-whatsapp", name: "WhatsApp coach" },
        ]}
        emptyHint="Try: KPI snapshot, open COD orders, storefront status, or draft a FAQ for approval."
      />
      <p className="mt-4 text-xs text-text-dim">
        <Link href="/approvals" className="text-accent hover:underline">
          Approvals
        </Link>
        {" · "}
        <Link href="/knowledge" className="text-accent hover:underline">
          Shop knowledge
        </Link>{" "}
        (Business / Enterprise).
      </p>
    </div>
  );
}
