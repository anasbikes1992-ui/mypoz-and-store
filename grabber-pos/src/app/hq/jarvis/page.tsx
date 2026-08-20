import { AgentChat } from "@/components/ai/AgentChat";

export default function HqJarvisPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Jarvis</h1>
      <p className="mt-1 max-w-2xl text-sm text-text-dim">
        HQ agentic ops assistant. Needs{" "}
        <code className="text-text-body">OPENAI_API_KEY</code> on Vercel.
        Tools are read-only: fleet pulse, tenant god&apos;s-view, quiet shops,
        open tickets, WhatsApp wiring, backup paths.
      </p>
      <AgentChat
        endpoint="/api/hq/ai/chat"
        agents={[{ id: "hq-ops", name: "HQ operations" }]}
        emptyHint="Try: Which shops are quiet? How is Anaz Store doing this week? Any open tickets?"
      />
    </div>
  );
}
