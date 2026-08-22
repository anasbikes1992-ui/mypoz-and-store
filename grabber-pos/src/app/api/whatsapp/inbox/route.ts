import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  appendMessage,
  assignConversation,
  getConversation,
  listConversations,
  listMessages,
  readWhatsAppSettings,
  resolveStaffHandoff,
  upsertConversation,
} from "@/lib/server/whatsapp-inbox-store";
import { sendWhatsAppText } from "@/lib/server/whatsapp";
import { resolveMetaAccessToken } from "@/lib/whatsapp/phone-number-id";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  try {
    if (id) {
      const convo = await getConversation(id);
      if (!convo) {
        return NextResponse.json(
          { success: false, data: null, error: "Not found" },
          { status: 404 },
        );
      }
      const thread = await listMessages(id);
      return NextResponse.json({
        success: true,
        data: { conversation: convo, messages: thread },
        error: null,
      });
    }
    const items = await listConversations();
    return NextResponse.json({ success: true, data: items, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}

const assignSchema = z.object({
  id: z.string().min(1).max(80),
  assignTo: z.string().max(120),
});

const replySchema = z.object({
  id: z.string().min(1).max(80),
  reply: z.string().min(1).max(4096),
  /** When true (default), clear needsStaffReply and return bot to greeting. */
  resolveStaff: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  return mutateInbox(req);
}

export async function POST(req: NextRequest) {
  return mutateInbox(req);
}

async function mutateInbox(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  if (
    body &&
    typeof body === "object" &&
    "reply" in body &&
    typeof (body as { reply?: unknown }).reply === "string"
  ) {
    return replyHandler(body);
  }
  return assignHandler(body);
}

async function assignHandler(body: unknown) {
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "id and assignTo required" },
      { status: 400 },
    );
  }
  try {
    const updated = await assignConversation(
      parsed.data.id,
      parsed.data.assignTo,
    );
    if (!updated) {
      return NextResponse.json(
        { success: false, data: null, error: "Not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: updated, error: null });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}

async function replyHandler(body: unknown) {
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "id and reply required" },
      { status: 400 },
    );
  }
  try {
    const convo = await getConversation(parsed.data.id);
    if (!convo) {
      return NextResponse.json(
        { success: false, data: null, error: "Not found" },
        { status: 404 },
      );
    }
    const text = parsed.data.reply.trim();
    if (!text) {
      return NextResponse.json(
        { success: false, data: null, error: "Empty reply" },
        { status: 400 },
      );
    }

    const waSettings = await readWhatsAppSettings();
    const phoneNumberId =
      waSettings.phoneNumberId ||
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      undefined;
    const to = (convo.phone || convo.waId).replace(/[^\d]/g, "");
    const sent = await sendWhatsAppText({
      to,
      body: text,
      phoneNumberId,
      token: resolveMetaAccessToken(waSettings.accessToken),
    });

    await appendMessage(
      {
        conversationId: convo.id,
        direction: "out",
        body: text,
        waMessageId: sent.messageId,
      },
      phoneNumberId,
    );

    let updated = await upsertConversation(
      {
        id: convo.id,
        waId: convo.waId,
        phone: convo.phone,
        name: convo.name,
        state: convo.state,
        payload: convo.payload,
        lastMessage: text,
        lastSaleId: convo.lastSaleId,
        needsStaffReply: convo.needsStaffReply,
        assignedTo: convo.assignedTo,
      },
      phoneNumberId,
    );

    if (parsed.data.resolveStaff !== false) {
      updated =
        (await resolveStaffHandoff(convo.id, phoneNumberId)) ?? updated;
    }

    const messages = await listMessages(convo.id, phoneNumberId);
    return NextResponse.json({
      success: true,
      data: { conversation: updated, messages },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}
