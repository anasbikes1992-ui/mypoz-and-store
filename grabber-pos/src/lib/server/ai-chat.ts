import "server-only";
import { AI_AGENTS, type AgentId } from "@/lib/ai/agents";
import { runTool, toolsFor } from "@/lib/server/ai-tools";
import { readAiSettings } from "@/lib/server/ai-keys";

type ChatMsg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
};

export async function resolveApiKey(plane: "hq" | "owner"): Promise<string | null> {
  if (plane === "hq") {
    const env = process.env.OPENAI_API_KEY?.trim();
    if (env) return env;
  }
  const stored = (await readAiSettings()).openaiApiKey.trim();
  return stored || process.env.OPENAI_API_KEY?.trim() || null;
}

export async function runAgentChat(opts: {
  agentId: AgentId;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const spec = AI_AGENTS[opts.agentId];
  if (!spec) throw new Error("Unknown agent");
  const key = await resolveApiKey(spec.plane);
  if (!key) {
    throw new Error(
      spec.plane === "hq"
        ? "Set OPENAI_API_KEY on Vercel or paste a key in Settings."
        : "Add an OpenAI API key in Settings, or ask HQ to set OPENAI_API_KEY.",
    );
  }

  const messages: ChatMsg[] = [
    { role: "system", content: spec.system },
    ...opts.messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let round = 0; round < 4; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages,
        tools: toolsFor(opts.agentId),
        tool_choice: "auto",
        temperature: 0.3,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 240)}`);
    }
    const json = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id: string;
            function: { name: string; arguments: string };
          }[];
        };
      }[];
    };
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new Error("Empty model response");
    if (msg.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: msg.tool_calls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: c.function,
        })),
      });
      for (const call of msg.tool_calls) {
        const result = await runTool(
          call.function.name,
          spec.plane,
          call.function.arguments,
        );
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
      continue;
    }
    return (msg.content ?? "").trim() || "No reply.";
  }
  return "Stopped after tool rounds. Ask a shorter question.";
}
