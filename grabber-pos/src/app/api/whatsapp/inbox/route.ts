import { NextRequest, NextResponse } from "next/server";
import {
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
