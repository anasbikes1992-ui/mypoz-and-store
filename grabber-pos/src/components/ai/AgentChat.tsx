"use client";

import { useState } from "react";

interface AgentOpt {
  id: string;
  name: string;
}

export function AgentChat({
  endpoint,
  agents,
  emptyHint,
}: {
  endpoint: string;
  agents: AgentOpt[];
  emptyHint: string;
}) {
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ role: "user" | "assistant"; content: string }[]>(
    [],
  );

  async function send() {
    const text = input.trim();
    if (!text || !agentId) return;
    const next = [...log, { role: "user" as const, content: text }];
    setLog(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, messages: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Chat failed");
      setLog([...next, { role: "assistant", content: json.data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 grid gap-4">
      <label className="block text-sm">
        <span className="mb-1 block text-text-dim">Agent</span>
        <select
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-line bg-surface-2 px-3 py-2 text-text-strong"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <div className="min-h-56 space-y-3 rounded-2xl border border-line bg-surface-1 p-4">
        {log.length === 0 ? (
          <p className="text-sm text-text-dim">{emptyHint}</p>
        ) : (
          log.map((m, i) => (
            <p
              key={`${m.role}-${i}`}
              className={`whitespace-pre-wrap text-sm ${
                m.role === "user" ? "text-text-strong" : "text-text-body"
              }`}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-text-dim">
                {m.role === "user" ? "You" : "Jarvis"}
              </span>
              <br />
              {m.content}
            </p>
          ))
        )}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask about stock, sales, or tenants…"
          className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-text-strong"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void send()}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
