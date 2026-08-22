import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantSession } from "@/lib/server/auth-session";
import {
  publicWhatsAppSettings,
  readWhatsAppSettings,
  writeWhatsAppSettings,
  type WhatsAppSettings,
} from "@/lib/server/whatsapp-inbox-store";
import { normalizeEnabledPaths } from "@/lib/whatsapp/automation-graph";

const metaPhoneNumberId = z
  .string()
  .max(80)
  .optional()
  .refine((v) => !v?.trim() || /^\d{10,20}$/.test(v.trim()), {
    message:
      "Phone number id must be the numeric Meta WhatsApp phone number id (digits only).",
  });

const patchSchema = z.object({
  phoneNumberId: metaPhoneNumberId,
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
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
  const settings = await readWhatsAppSettings(undefined, gate.session.orgId);
  return NextResponse.json({
    success: true,
    data: publicWhatsAppSettings(settings),
    error: null,
  });
}

export async function PUT(req: NextRequest) {
  const gate = await requireTenantSession();
  if (!gate.ok) return gate.response;
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
  try {
    const settings = await writeWhatsAppSettings(patch, gate.session.orgId);
    return NextResponse.json({
      success: true,
      data: publicWhatsAppSettings(settings),
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Could not save settings",
      },
      { status: 400 },
    );
  }
}
