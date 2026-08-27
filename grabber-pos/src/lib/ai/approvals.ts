/**
 * Agent approval proposals — humans decide; agents never write ledgers directly.
 */
export const APPROVAL_KINDS = [
  "kb_article_draft",
  "wa_outbound_draft",
] as const;

export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export const APPROVAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "expired",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type ApprovalPayload =
  | {
      kind: "kb_article_draft";
      title: string;
      body: string;
      tags?: string[];
    }
  | {
      kind: "wa_outbound_draft";
      to: string;
      body: string;
      note?: string;
    };

export function isApprovalKind(v: string): v is ApprovalKind {
  return (APPROVAL_KINDS as readonly string[]).includes(v);
}
