import Link from "next/link";
import { AgentChat } from "@/components/ai/AgentChat";

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold text-text-strong">Jarvis</h1>
      <p className="mt-1 text-sm text-text-dim">
        Shop agents read the same POS catalogue and sales as the till. They
        cannot write stock. Add your OpenAI key in Settings if HQ has not set a
        platform key.
      </p>
      <AgentChat
        endpoint="/api/ai/chat"
        agents={[
          { id: "owner-retail", name: "Shop retail" },
          { id: "owner-whatsapp", name: "WhatsApp coach" },
        ]}
        emptyHint="Ask for low stock, today’s sales, WhatsApp copy, or your shop policies (Business+ knowledge)."
      />
      <p className="mt-4 text-xs text-text-dim">
        Train Jarvis with shop-specific FAQs on{" "}
        <Link href="/knowledge" className="text-accent hover:underline">
          Shop knowledge
        </Link>{" "}
        (Business / Enterprise).
      </p>
    </div>
  );
}
