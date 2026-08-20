import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  assignConversation,
  getConversation,
  listConversations,
  listMessages,
} from "@/lib/server/whatsapp-inbox-store";

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

export async function PATCH(req: NextRequest) {
  return assignHandler(req);
}

export async function POST(req: NextRequest) {
  return assignHandler(req);
}

async function assignHandler(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
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
