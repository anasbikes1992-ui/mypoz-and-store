import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  HQ_TOOLS,
  OWNER_ORDERS_TOOLS,
  OWNER_STOREFRONT_TOOLS,
  OWNER_TOOLS,
  OWNER_WHATSAPP_TOOLS,
  toolsFor,
} from "@/lib/server/ai-tools";
import { AI_AGENTS, OWNER_AGENT_IDS } from "@/lib/ai/agents";

describe("Jarvis tool registry", () => {
  it("exposes expanded HQ agentic tools", () => {
    const names = HQ_TOOLS.map((t) => t.function.name);
    expect(names).toContain("fleet_pulse");
    expect(toolsFor("hq-ops")).toHaveLength(HQ_TOOLS.length);
  });

  it("registers seven agents with tool subsets", () => {
    expect(Object.keys(AI_AGENTS)).toHaveLength(7);
    expect(OWNER_AGENT_IDS).toHaveLength(5);
    expect(toolsFor("owner-orders")).toHaveLength(OWNER_ORDERS_TOOLS.length);
    expect(toolsFor("owner-storefront")).toHaveLength(
      OWNER_STOREFRONT_TOOLS.length,
    );
    expect(OWNER_TOOLS.map((t) => t.function.name)).toContain(
      "propose_kb_article",
    );
    expect(OWNER_WHATSAPP_TOOLS.map((t) => t.function.name)).toContain(
      "propose_wa_message",
    );
  });
});
