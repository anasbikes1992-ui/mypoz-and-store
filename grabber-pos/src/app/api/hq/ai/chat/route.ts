import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AI_AGENTS, HQ_AGENT_IDS, type AgentId } from "@/lib/ai/agents";
import { tenantContextFromSession } from "@/lib/ai/tenant-context";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { runAgentChat } from "@/lib/server/ai-chat";

const bodySchema = z.object({
  agentId: z.enum(HQ_AGENT_IDS),
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
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
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
  if (AI_AGENTS[agentId].plane !== "hq") {
    return NextResponse.json(
      { success: false, data: null, error: "Use shop Jarvis for that agent" },
      { status: 403 },
    );
  }
  void tenantContextFromSession(
    {
      orgId: "hq",
      userId: gate.identity.id,
      role: "owner",
    },
    "hq",
  );

  try {
    const reply = await runAgentChat({
      agentId,
      messages: parsed.data.messages,
      userId: gate.identity.id,
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
