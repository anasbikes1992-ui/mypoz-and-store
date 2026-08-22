import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import {
  attachWhatsAppToOrg,
  detachWhatsAppFromOrg,
  listWhatsAppFleet,
} from "@/lib/server/whatsapp-durable";

export async function GET() {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  try {
    const tenants = await listWhatsAppFleet();
    return NextResponse.json({
      success: true,
      data: {
        webhookPath: "/api/whatsapp/webhook",
        envToken: Boolean(process.env.WHATSAPP_TOKEN),
        envPhoneNumberId: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
        envVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
        envAppSecret: Boolean(process.env.WHATSAPP_APP_SECRET),
        tenants,
      },
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

const attachSchema = z.object({
  orgId: z.string().uuid(),
  phoneNumberId: z
    .string()
    .max(80)
    .optional()
    .refine((v) => !v?.trim() || /^\d{10,20}$/.test(v.trim()), {
      message: "Phone number id must be numeric Meta digits only.",
    }),
  accessToken: z.string().max(400).optional(),
  locale: z.enum(["en", "si", "ta"]).optional(),
  detach: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  const gate = await requireGmsAdmin();
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
  const parsed = attachSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid input" },
      { status: 400 },
    );
  }
  if (parsed.data.detach) {
    await detachWhatsAppFromOrg(parsed.data.orgId);
    return NextResponse.json({
      success: true,
      data: { detached: true },
      error: null,
    });
  }
  try {
    await attachWhatsAppToOrg(parsed.data.orgId, parsed.data);
    const tenants = await listWhatsAppFleet();
    const row = tenants.find((t) => t.orgId === parsed.data.orgId);
    return NextResponse.json({
      success: true,
      data: {
        saved: true,
        phoneNumberId: row?.phoneNumberId ?? "",
        phoneNumberIdSet: row?.phoneNumberIdSet ?? false,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Could not save",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  let orgId = req.nextUrl.searchParams.get("orgId") ?? "";
  if (!orgId) {
    try {
      const body = (await req.json()) as { orgId?: string };
      orgId = body?.orgId ?? "";
    } catch {
      // query-only
    }
  }
  const parsed = z.string().uuid().safeParse(orgId);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: null, error: "orgId required" },
      { status: 400 },
    );
  }
  await detachWhatsAppFromOrg(parsed.data);
  return NextResponse.json({
    success: true,
    data: { detached: true },
    error: null,
  });
}
