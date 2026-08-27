import "server-only";
import { randomUUID } from "crypto";
import { recordStore } from "./persistence/record-store";
import type {
  ApprovalKind,
  ApprovalPayload,
  ApprovalStatus,
} from "@/lib/ai/approvals";
import { createTenantKb } from "@/lib/server/tenant-kb-store";
import {
  sendWhatsAppText,
  WhatsAppNotConfiguredError,
} from "@/lib/server/whatsapp";
import { resolveMetaAccessToken } from "@/lib/whatsapp/phone-number-id";
import {
  isOptedOut,
  readWhatsAppSettings,
} from "@/lib/server/whatsapp-inbox-store";

export interface AgentApproval {
  id: string;
  kind: ApprovalKind;
  status: ApprovalStatus;
  agentId: string;
  plane: "owner" | "hq";
  title: string;
  summary: string;
  payload: ApprovalPayload;
  proposedBy: string;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rejectionReason?: string;
}

const store = recordStore<AgentApproval>({
  collection: "agent-approvals",
  file: "agent-approvals.json",
});

export async function listApprovals(opts?: {
  status?: ApprovalStatus;
}): Promise<AgentApproval[]> {
  const rows = await store.list();
  const filtered = opts?.status
    ? rows.filter((r) => r.status === opts.status)
    : rows;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getApproval(id: string): Promise<AgentApproval | null> {
  return store.get(id);
}

export async function proposeApproval(input: {
  kind: ApprovalKind;
  agentId: string;
  plane: "owner" | "hq";
  title: string;
  summary: string;
  payload: ApprovalPayload;
  proposedBy: string;
}): Promise<AgentApproval> {
  const now = new Date().toISOString();
  const row: AgentApproval = {
    id: "APR-" + randomUUID().slice(0, 10),
    kind: input.kind,
    status: "pending",
    agentId: input.agentId,
    plane: input.plane,
    title: input.title.trim().slice(0, 160),
    summary: input.summary.trim().slice(0, 400),
    payload: input.payload,
    proposedBy: input.proposedBy,
    createdAt: now,
  };
  return store.put(row);
}

export async function rejectApproval(opts: {
  id: string;
  decidedBy: string;
  reason?: string;
}): Promise<AgentApproval | null> {
  const current = await store.get(opts.id);
  if (!current || current.status !== "pending") return null;
  return store.put({
    ...current,
    status: "rejected",
    decidedAt: new Date().toISOString(),
    decidedBy: opts.decidedBy,
    rejectionReason: (opts.reason ?? "").trim().slice(0, 400) || undefined,
  });
}

/**
 * Approve and execute the side-effect (KB create or WA send).
 * Returns updated row + execution note.
 */
export async function approveApproval(opts: {
  id: string;
  decidedBy: string;
}): Promise<{ approval: AgentApproval; executed: string } | null> {
  const current = await store.get(opts.id);
  if (!current || current.status !== "pending") return null;

  let executed = "ok";
  const payload = current.payload;

  if (payload.kind === "kb_article_draft") {
    await createTenantKb({
      title: payload.title,
      body: payload.body,
      tags: payload.tags,
      source: "manual",
    });
    executed = "kb_article_created";
  } else if (payload.kind === "wa_outbound_draft") {
    const to = payload.to.replace(/\D/g, "");
    if (await isOptedOut(to)) {
      throw new Error("Recipient opted out of WhatsApp automations");
    }
    const settings = await readWhatsAppSettings();
    try {
      await sendWhatsAppText({
        to,
        body: payload.body.slice(0, 4096),
        token: resolveMetaAccessToken(settings.accessToken) || undefined,
        phoneNumberId: settings.phoneNumberId || undefined,
      });
      executed = "wa_sent";
    } catch (err) {
      if (err instanceof WhatsAppNotConfiguredError) {
        throw new Error("WhatsApp is not configured for this shop");
      }
      throw err;
    }
  }

  const approval = await store.put({
    ...current,
    status: "approved",
    decidedAt: new Date().toISOString(),
    decidedBy: opts.decidedBy,
  });
  return { approval, executed };
}

export async function pendingApprovalCount(): Promise<number> {
  const rows = await store.list();
  return rows.filter((r) => r.status === "pending").length;
}
