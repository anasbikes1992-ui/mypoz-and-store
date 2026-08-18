import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/commerce/json-ld";

describe("jsonLd", () => {
  it("escapes script breakouts", () => {
    const raw = jsonLd({ name: "</script><img>" });
    expect(raw).not.toContain("</script>");
    expect(raw).toContain("\\u003c");
  });
});
