import { AgentChat } from "@/components/ai/AgentChat";

export default function HqJarvisPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-strong">Jarvis</h1>
      <p className="mt-1 text-sm text-text-dim">
        HQ operations agent. Uses OPENAI_API_KEY on Vercel, or a key saved in
        Settings while you are in this org. Tools are read-only (tenant health,
        backup paths).
      </p>
      <AgentChat
        endpoint="/api/hq/ai/chat"
        agents={[{ id: "hq-ops", name: "HQ operations" }]}
        emptyHint="Ask how many tenants are expired, or where full backups download."
      />
    </div>
  );
}
