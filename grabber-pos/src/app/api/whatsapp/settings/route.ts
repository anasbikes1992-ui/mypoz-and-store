import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  publicWhatsAppSettings,
  readWhatsAppSettings,
  writeWhatsAppSettings,
  type WhatsAppSettings,
} from "@/lib/server/whatsapp-inbox-store";
import { normalizeEnabledPaths } from "@/lib/whatsapp/automation-graph";

const patchSchema = z.object({
  phoneNumberId: z.string().max(80).optional(),
  verifyToken: z.string().max(200).optional(),
  accessToken: z.string().max(400).optional(),
  locale: z.enum(["en", "si", "ta"]).optional(),
  greeting: z.string().max(400).optional(),
  locationText: z.string().max(400).optional(),
  offersText: z.string().max(400).optional(),
  staffNotify: z.boolean().optional(),
  enabledPaths: z
    .object({
      order: z.boolean().optional(),
      menu: z.boolean().optional(),
      offers: z.boolean().optional(),
      location: z.boolean().optional(),
      track: z.boolean().optional(),
      staff: z.boolean().optional(),
    })
    .optional(),
});

export async function GET() {
  const settings = await readWhatsAppSettings();
  return NextResponse.json({
    success: true,
    data: publicWhatsAppSettings(settings),
    error: null,
  });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid settings" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const patch: Partial<WhatsAppSettings> = {
    phoneNumberId: data.phoneNumberId,
    verifyToken: data.verifyToken,
    accessToken: data.accessToken,
    locale: data.locale,
    greeting: data.greeting,
    locationText: data.locationText,
    offersText: data.offersText,
    staffNotify: data.staffNotify,
  };
  if (data.enabledPaths) {
    patch.enabledPaths = normalizeEnabledPaths(data.enabledPaths);
  }
  const settings = await writeWhatsAppSettings(patch);
  return NextResponse.json({
    success: true,
    data: publicWhatsAppSettings(settings),
    error: null,
  });
}
