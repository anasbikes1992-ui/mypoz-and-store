import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HQ_TOOLS, OWNER_TOOLS, toolsFor } from "@/lib/server/ai-tools";

describe("Jarvis tool registry", () => {
  it("exposes expanded HQ agentic tools", () => {
    const names = HQ_TOOLS.map((t) => t.function.name);
    expect(names).toContain("fleet_pulse");
    expect(names).toContain("tenant_monitor");
    expect(names).toContain("open_tickets");
    expect(names).toContain("whatsapp_fleet_hint");
    expect(toolsFor("hq-ops")).toHaveLength(HQ_TOOLS.length);
  });

  it("keeps owner retail tools separate", () => {
    expect(toolsFor("owner-retail")).toHaveLength(OWNER_TOOLS.length);
    expect(toolsFor("owner-whatsapp")).toHaveLength(OWNER_TOOLS.length);
  });
});
