import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AI_AGENTS, type AgentId } from "@/lib/ai/agents";
import { runAgentChat } from "@/lib/server/ai-chat";

const bodySchema = z.object({
  agentId: z.enum(["hq-ops", "owner-retail", "owner-whatsapp"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .max(20),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid chat" },
      { status: 400 },
    );
  }
  const agentId = parsed.data.agentId as AgentId;
  if (AI_AGENTS[agentId].plane !== "owner") {
    return NextResponse.json(
      { success: false, data: null, error: "Use HQ Jarvis for that agent" },
      { status: 403 },
    );
  }
  try {
    const reply = await runAgentChat({
      agentId,
      messages: parsed.data.messages,
    });
    return NextResponse.json({ success: true, data: { reply }, error: null });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Chat failed",
      },
      { status: 400 },
    );
  }
}
