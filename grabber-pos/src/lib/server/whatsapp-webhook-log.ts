import "server-only";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createServiceSupabase } from "@/lib/supabase/server";

/** HQ org — webhook audit is platform-wide when tenant cannot be resolved. */
const HQ_ORG_ID =
  process.env.MYPOZ_HQ_ORG_ID?.trim() ||
  "cccccccc-cccc-cccc-cccc-cccccccccccc";
const AUDIT_KEY = "whatsapp_webhook_log";
const MAX_EVENTS = 40;

export type WebhookAuditEvent = {
  at: string;
  ok: boolean;
  reason?: string;
  phoneNumberId?: string;
  messageCount?: number;
  wabaId?: string;
  hasSignatureHeader?: boolean;
};

function useAudit(): boolean {
  return isSupabaseEnabled && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Best-effort ring buffer for Meta delivery debugging (HQ org document). */
export async function appendWebhookAudit(
  event: Omit<WebhookAuditEvent, "at">,
): Promise<void> {
  if (!useAudit()) return;
  try {
    const db = createServiceSupabase();
    const { data } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", HQ_ORG_ID)
      .eq("key", AUDIT_KEY)
      .maybeSingle<{ data: { events?: WebhookAuditEvent[] } }>();

    const prev = data?.data?.events ?? [];
    const row: WebhookAuditEvent = { ...event, at: new Date().toISOString() };
    const events = [row, ...prev].slice(0, MAX_EVENTS);

    await db.from("app_documents").upsert(
      {
        org_id: HQ_ORG_ID,
        key: AUDIT_KEY,
        data: { events },
      },
      { onConflict: "org_id,key" },
    );
  } catch (err) {
    console.error(
      "[whatsapp-webhook] audit log failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function readWebhookAudit(): Promise<WebhookAuditEvent[]> {
  if (!useAudit()) return [];
  try {
    const db = createServiceSupabase();
    const { data } = await db
      .from("app_documents")
      .select("data")
      .eq("org_id", HQ_ORG_ID)
      .eq("key", AUDIT_KEY)
      .maybeSingle<{ data: { events?: WebhookAuditEvent[] } }>();
    return data?.data?.events ?? [];
  } catch {
    return [];
  }
}
