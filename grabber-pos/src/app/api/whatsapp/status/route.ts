import { NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/server/auth-session";
import { isWhatsAppConfigured } from "@/lib/server/whatsapp";
import {
  publicWhatsAppSettings,
  readWhatsAppSettings,
} from "@/lib/server/whatsapp-inbox-store";

export async function GET() {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const settings = await readWhatsAppSettings(undefined, gate.session.orgId);
  return NextResponse.json({
    success: true,
    data: {
      configured: isWhatsAppConfigured() || Boolean(settings.phoneNumberId),
      envToken: Boolean(process.env.WHATSAPP_TOKEN?.trim()),
      envPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
      envVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim()),
      envAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET?.trim()),
      webhookPath: "/api/whatsapp/webhook",
      settings: publicWhatsAppSettings(settings),
    },
    error: null,
  });
}
