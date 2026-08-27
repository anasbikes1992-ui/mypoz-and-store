import { describe, expect, it } from "vitest";
import {
  APPROVAL_KINDS,
  isApprovalKind,
} from "@/lib/ai/approvals";

describe("approvals types", () => {
  it("defines kb and wa draft kinds", () => {
    expect(APPROVAL_KINDS).toContain("kb_article_draft");
    expect(APPROVAL_KINDS).toContain("wa_outbound_draft");
    expect(isApprovalKind("kb_article_draft")).toBe(true);
    expect(isApprovalKind("nuke")).toBe(false);
  });
});
