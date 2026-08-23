import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HQ_TOOLS, OWNER_TOOLS, runTool, toolsFor } from "@/lib/server/ai-tools";

describe("Jarvis tool registry", () => {
  it("exposes expanded HQ agentic tools", () => {
    const names = HQ_TOOLS.map((t) => t.function.name);
    expect(names).toContain("fleet_pulse");
    expect(names).toContain("tenant_monitor");
    expect(names).toContain("open_tickets");
    expect(names).toContain("whatsapp_fleet_hint");
    expect(names).toContain("kb_search");
    expect(names).toContain("list_verticals");
    expect(toolsFor("hq-ops")).toHaveLength(HQ_TOOLS.length);
  });

  it("keeps owner retail tools separate and includes kb_search", () => {
    expect(OWNER_TOOLS.map((t) => t.function.name)).toContain("kb_search");
    expect(OWNER_TOOLS.map((t) => t.function.name)).toContain("list_verticals");
    expect(toolsFor("owner-retail")).toHaveLength(OWNER_TOOLS.length);
    expect(toolsFor("owner-whatsapp")).toHaveLength(OWNER_TOOLS.length);
  });

  it("kb_search returns curated hits", async () => {
    const raw = await runTool(
      "kb_search",
      "owner",
      JSON.stringify({ query: "whatsapp webhook" }),
    );
    const json = JSON.parse(raw) as { hits: { id: string }[] };
    expect(json.hits[0]?.id).toBe("whatsapp-attach");
  });

  it("list_verticals returns routes", async () => {
    const raw = await runTool(
      "list_verticals",
      "hq",
      JSON.stringify({ query: "delivery" }),
    );
    const json = JSON.parse(raw) as {
      verticals: { key: string; href: string }[];
    };
    expect(json.verticals.some((v) => v.key === "delivery")).toBe(true);
  });
});
