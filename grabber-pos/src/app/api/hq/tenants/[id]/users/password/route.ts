import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireGmsAdmin } from "@/lib/server/gms-auth";
import { getHqTenant } from "@/lib/server/hq-repo";
import {
  hqSendPasswordReset,
  hqSetUserPassword,
} from "@/lib/server/hq-password";

const bodySchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["set", "send_reset"]),
  /** Optional; if omitted for `set`, a temporary password is generated. */
  password: z.string().min(8).max(72).optional(),
});

/**
 * HQ password ops for a tenant member.
 * - set: force a new password (returned once; never logged)
 * - send_reset: Supabase recovery link emailed (or returned if Resend unset)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireGmsAdmin();
  if (!gate.ok) return gate.response;
  const { id: orgId } = await params;

  const tenant = await getHqTenant(orgId);
  if (!tenant) {
    return NextResponse.json(
      { success: false, data: null, error: "Tenant not found" },
      { status: 404 },
    );
  }
  if (tenant.source === "clients" || orgId === "local") {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error:
          "Password reset needs a live organization (reseller_licences). Onboard/provision an org first.",
      },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.action === "set") {
      const result = await hqSetUserPassword({
        orgId,
        userId: parsed.data.userId,
        password: parsed.data.password,
      });
      return NextResponse.json({
        success: true,
        data: {
          action: "set",
          email: result.email,
          fullName: result.fullName,
          temporaryPassword: result.temporaryPassword,
          loginUrl: `${(process.env.NEXT_PUBLIC_APP_URL || "https://mypoz-and-store-ui.vercel.app").replace(/\/$/, "")}/login`,
        },
        error: null,
      });
    }

    const result = await hqSendPasswordReset({
      orgId,
      userId: parsed.data.userId,
      businessName: tenant.brand?.businessName || tenant.name,
      accentColor: tenant.brand?.accentColor,
    });
    return NextResponse.json({
      success: true,
      data: {
        action: "send_reset",
        email: result.email,
        fullName: result.fullName,
        emailed: result.emailed,
        resetUrl: result.resetUrl ?? null,
      },
      error: null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: e instanceof Error ? e.message : "Password op failed",
      },
      { status: 400 },
    );
  }
}
