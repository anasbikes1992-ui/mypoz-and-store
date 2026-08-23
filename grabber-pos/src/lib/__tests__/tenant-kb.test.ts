import { describe, expect, it } from "vitest";
import {
  canUseTenantKnowledge,
  normalizeArticleInput,
  scoreTenantArticle,
  tokenizeKbQuery,
} from "@/lib/ai/tenant-kb";

describe("tenant knowledge plan gate", () => {
  it("allows business and enterprise", () => {
    expect(canUseTenantKnowledge("business")).toBe(true);
    expect(canUseTenantKnowledge("enterprise")).toBe(true);
  });

  it("blocks starter unless extras", () => {
    expect(canUseTenantKnowledge("starter")).toBe(false);
    expect(canUseTenantKnowledge("starter", ["knowledge"])).toBe(true);
    expect(canUseTenantKnowledge("starter", ["jarvis-kb"])).toBe(true);
  });
});

describe("tenant article helpers", () => {
  it("normalizes input", () => {
    const n = normalizeArticleInput({
      title: "  Returns  ",
      body: "  7 days with receipt  ",
      tags: ["Returns", " FAQ "],
    });
    expect(n?.title).toBe("Returns");
    expect(n?.tags).toEqual(["returns", "faq"]);
  });

  it("scores tagged articles higher", () => {
    const tokens = tokenizeKbQuery("return policy");
    const score = scoreTenantArticle(
      {
        title: "Return policy",
        body: "We accept returns within 7 days.",
        tags: ["return", "policy"],
      },
      tokens,
    );
    expect(score).toBeGreaterThan(3);
  });
});
