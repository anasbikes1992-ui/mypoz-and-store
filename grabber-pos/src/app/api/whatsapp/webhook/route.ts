import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments/gateways/sig";
import { verifyWhatsAppSignature } from "@/lib/whatsapp/signature";
import { handleInboundText } from "@/lib/whatsapp/bot";
import { readWhatsAppSettings } from "@/lib/server/whatsapp-inbox-store";
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

  return NextResponse.json(
    { success: false, data: null, error: "Verify token mismatch" },
    { status: 403 },
  );
}

type WaPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: {
          id?: string;
          from?: string;
          type?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = process.env.WHATSAPP_APP_SECRET;
  const signed = verifyWhatsAppSignature(
    raw,
    req.headers.get("x-hub-signature-256"),
    secret,
  );
  if (!signed) {
    if (requireSupabase || secret) {
      return NextResponse.json(
        { success: false, data: null, error: "Invalid WhatsApp signature" },
        { status: 401 },
      );
    }
    // Demo without WHATSAPP_APP_SECRET: accept so local inbox can be exercised.
  }

  let body: WaPayload;
  try {
    body = JSON.parse(raw) as WaPayload;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const msg of value?.messages ?? []) {
        if (msg.type !== "text" || !msg.text?.body || !msg.from) continue;
        const name = value?.contacts?.[0]?.profile?.name;
        await handleInboundText({
          waId: msg.from,
          name,
          text: msg.text.body,
          waMessageId: msg.id,
          phoneNumberId: value?.metadata?.phone_number_id,
        });
      }
    }
  }

  return NextResponse.json({ success: true, data: { received: true }, error: null });
}
