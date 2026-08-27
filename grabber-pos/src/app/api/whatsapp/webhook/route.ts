import { after, NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments/gateways/sig";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/signature";
import { handleInboundText } from "@/lib/whatsapp/bot";
import {
  readWhatsAppSettings,
  updateMessageDeliveryStatus,
} from "@/lib/server/whatsapp-inbox-store";
import { appendWebhookAudit } from "@/lib/server/whatsapp-webhook-log";
import { extractInboundText } from "@/lib/whatsapp/inbound-text";
import { requireSupabase } from "@/lib/supabase/config";

function verifyTokens(): string[] {
  const tokens = [process.env.WHATSAPP_VERIFY_TOKEN ?? ""];
  return tokens.filter(Boolean);
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json(
      { success: false, data: null, error: "Verify token mismatch" },
      { status: 403 },
    );
  }

  const envOk = verifyTokens().some((expected) => safeEqual(token, expected));
  if (envOk) {
    return new NextResponse(challenge, { status: 200 });
  }

  try {
    const settings = await readWhatsAppSettings();
    if (settings.verifyToken && safeEqual(token, settings.verifyToken)) {
      return new NextResponse(challenge, { status: 200 });
    }
  } catch {
    // Settings may be unavailable without a session; env token is enough.
  }

  // Webhook verify has no cookies — accept any org override verify token.
  try {
    const { isSupabaseEnabled } = await import("@/lib/supabase/config");
    const { createServiceSupabase } = await import("@/lib/supabase/server");
    if (isSupabaseEnabled && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const db = createServiceSupabase();
      const { data: docs } = await db
        .from("app_documents")
        .select("data")
        .eq("key", "whatsapp");
      for (const row of docs ?? []) {
        const verify = String(
          (row.data as { verifyToken?: string } | null)?.verifyToken ?? "",
        ).trim();
        if (verify && safeEqual(token, verify)) {
          return new NextResponse(challenge, { status: 200 });
        }
      }
    }
  } catch {
    // Fall through to 403.
  }

  return NextResponse.json(
    { success: false, data: null, error: "Verify token mismatch" },
    { status: 403 },
  );
}

type WaChangeValue = {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: {
    id?: string;
    from?: string;
    type?: string;
    text?: { body?: string };
    button?: { text?: string; payload?: string };
    interactive?: {
      type?: string;
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };
  }[];
  statuses?: {
    id?: string;
    status?: string;
    timestamp?: string;
    recipient_id?: string;
  }[];
};

type WaPayload = {
  object?: string;
  /** Meta “Send to My Server” sometimes posts a bare field sample. */
  field?: string;
  value?: WaChangeValue;
  entry?: {
    id?: string;
    changes?: {
      field?: string;
      value?: WaChangeValue;
    }[];
  }[];
};

/** Normalize Meta test payloads `{ field, value }` into the real webhook envelope. */
function normalizeWebhookBody(body: WaPayload): WaPayload {
  if (Array.isArray(body.entry) && body.entry.length > 0) return body;
  if (body.field && body.value) {
    return {
      object: body.object ?? "whatsapp_business_account",
      entry: [
        {
          id: "meta-sample",
          changes: [{ field: body.field, value: body.value }],
        },
      ],
    };
  }
  return body;
}

type InboundJob = {
  waId: string;
  name?: string;
  text: string;
  waMessageId?: string;
  phoneNumberId?: string;
};

type StatusJob = {
  waMessageId: string;
  status: string;
  phoneNumberId?: string;
};

function collectInboundJobs(body: WaPayload): InboundJob[] {
  const jobs: InboundJob[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      for (const msg of value?.messages ?? []) {
        const text = extractInboundText(msg);
        if (!text || !msg.from) continue;
        const contact = value?.contacts?.find((c) => c.wa_id === msg.from);
        jobs.push({
          waId: msg.from,
          name: contact?.profile?.name,
          text,
          waMessageId: msg.id,
          phoneNumberId,
        });
      }
    }
  }
  return jobs;
}

function collectStatusJobs(body: WaPayload): StatusJob[] {
  const jobs: StatusJob[] = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") continue;
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      for (const st of value?.statuses ?? []) {
        if (!st.id || !st.status) continue;
        jobs.push({
          waMessageId: st.id,
          status: st.status,
          phoneNumberId,
        });
      }
    }
  }
  return jobs;
}

function summarizePayload(body: WaPayload): {
  wabaId?: string;
  phoneNumberId?: string;
  messageCount: number;
  statusCount: number;
} {
  let messageCount = 0;
  let statusCount = 0;
  let phoneNumberId: string | undefined;
  const wabaId = body.entry?.[0]?.id;
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      phoneNumberId ||= change.value?.metadata?.phone_number_id;
      messageCount += change.value?.messages?.length ?? 0;
      statusCount += change.value?.statuses?.length ?? 0;
    }
  }
  return { wabaId, phoneNumberId, messageCount, statusCount };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sigHeader = req.headers.get("x-hub-signature-256");
  const secret = process.env.WHATSAPP_APP_SECRET?.trim();
  const signed = verifyWhatsAppSignature(raw, sigHeader, secret);

  if (!signed) {
    if (requireSupabase || secret) {
      void appendWebhookAudit({
        ok: false,
        reason: "invalid_signature",
        hasSignatureHeader: Boolean(sigHeader),
      });
      return NextResponse.json(
        { success: false, data: null, error: "Invalid WhatsApp signature" },
        { status: 401 },
      );
    }
    // Demo without WHATSAPP_APP_SECRET: accept so local inbox can be exercised.
  }

  let body: WaPayload;
  try {
    body = normalizeWebhookBody(JSON.parse(raw) as WaPayload);
  } catch {
    void appendWebhookAudit({ ok: false, reason: "invalid_json" });
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const summary = summarizePayload(body);
  const jobs = collectInboundJobs(body);
  const statusJobs = collectStatusJobs(body);

  after(async () => {
    try {
      for (const job of statusJobs) {
        await updateMessageDeliveryStatus(
          job.waMessageId,
          job.status,
          job.phoneNumberId,
        );
      }
      for (const job of jobs) {
        await handleInboundText(job);
      }
      await appendWebhookAudit({
        ok: true,
        phoneNumberId: summary.phoneNumberId,
        wabaId: summary.wabaId,
        messageCount: summary.messageCount,
        reason:
          jobs.length || statusJobs.length
            ? "processed"
            : "no_text_or_status",
      });
    } catch (err) {
      console.error("[whatsapp-webhook] handler failed:", err);
      await appendWebhookAudit({
        ok: false,
        reason: "handler_error",
        phoneNumberId: summary.phoneNumberId,
        wabaId: summary.wabaId,
        messageCount: summary.messageCount,
      });
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      received: true,
      queued: jobs.length,
      statuses: statusJobs.length,
    },
    error: null,
  });
}
