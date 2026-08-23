import { describe, expect, it } from "vitest";
import { AI_AGENTS } from "@/lib/ai/agents";
import { JARVIS_PERSONA, jarvisSystem } from "@/lib/ai/jarvis-persona";
import { JARVIS_KB, searchKb } from "@/lib/ai/kb";
import { VERTICAL_GUIDES, listVerticalGuides } from "@/lib/ai/vertical-guides";

describe("Jarvis persona", () => {
  it("prepends persona to domain rules", () => {
    const sys = jarvisSystem("Never invent stock.");
    expect(sys.startsWith(JARVIS_PERSONA.slice(0, 40))).toBe(true);
    expect(sys).toContain("Domain rules:");
    expect(sys).toContain("Never invent stock.");
  });

  it("embeds persona and list_verticals in all agents", () => {
    for (const id of Object.keys(AI_AGENTS) as (keyof typeof AI_AGENTS)[]) {
      expect(AI_AGENTS[id].system).toContain("kb_search");
      expect(AI_AGENTS[id].system).toContain("list_verticals");
      expect(AI_AGENTS[id].system).toContain("Never invent");
      expect(AI_AGENTS[id].system.length).toBeGreaterThan(JARVIS_PERSONA.length);
    }
  });
});

describe("Jarvis KB", () => {
  it("has curated sections covering verticals", () => {
    expect(JARVIS_KB.length).toBeGreaterThanOrEqual(10);
    expect(JARVIS_KB.some((s) => s.id === "whatsapp-attach")).toBe(true);
    expect(JARVIS_KB.some((s) => s.id === "restaurant-floor")).toBe(true);
    expect(JARVIS_KB.some((s) => s.id === "delivery-hub")).toBe(true);
  });

  it("ranks whatsapp queries", () => {
    const r = searchKb("whatsapp webhook attach", { audience: "hq" });
    expect(r.hits.length).toBeGreaterThan(0);
    expect(r.hits[0].id).toBe("whatsapp-attach");
  });

  it("finds wholesale MOQ for owner audience", () => {
    const owner = searchKb("wholesale MOQ vip", { audience: "owner" });
    expect(owner.hits.some((h) => h.id === "wholesale-tiers")).toBe(true);
  });

  it("returns note on empty query", () => {
    const r = searchKb("   ");
    expect(r.hits).toHaveLength(0);
    expect(r.note).toBeTruthy();
  });

  it("hits for each major vertical probe", () => {
    const probes: Array<[string, string]> = [
      ["restaurant seat kot", "restaurant-floor"],
      ["delivery drivers", "delivery-hub"],
      ["rooms housekeeping", "rooms-rent"],
      ["repair SLA", "repair-alerts"],
      ["layaway digital", "layaway-digital-cc"],
    ];
    for (const [q, expectId] of probes) {
      const r = searchKb(q, { audience: "owner", limit: 3 });
      expect(r.hits.some((h) => h.id === expectId), q).toBe(true);
    }
  });
});

describe("vertical guides", () => {
  it("lists all sale-mode verticals", () => {
    expect(VERTICAL_GUIDES.length).toBeGreaterThanOrEqual(14);
    const all = listVerticalGuides();
    expect(all.verticals.length).toBe(VERTICAL_GUIDES.length);
  });

  it("filters restaurant", () => {
    const r = listVerticalGuides("restaurant");
    expect(r.verticals.some((v) => v.key === "restaurant")).toBe(true);
  });
});
