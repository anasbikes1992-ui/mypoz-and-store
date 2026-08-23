import { NextRequest, NextResponse } from "next/server";
import {
  EMAIL_TEMPLATE_CATALOG,
  EMAIL_TEMPLATE_IDS,
  type EmailTemplateId,
} from "@/lib/email/catalog";
import { isEmailConfigured } from "@/lib/email";
import { renderSampleEmail } from "@/lib/email/samples";
import { readSettings } from "@/lib/server/settings-store";
import { readTenant } from "@/lib/server/tenant-store";
import {
  requireRoles,
  requireTenantSession,
} from "@/lib/server/auth-session";
import { requireGmsAdmin } from "@/lib/server/gms-auth";

/** GET — list templates or render HTML preview (?template=password-reset) */
export async function GET(req: NextRequest) {
  const template = req.nextUrl.searchParams.get("template") as EmailTemplateId | null;

  if (!template) {
    return NextResponse.json({
      success: true,
      data: {
        configured: isEmailConfigured(),
        templates: EMAIL_TEMPLATE_CATALOG,
      },
      error: null,
    });
  }

  if (!EMAIL_TEMPLATE_IDS.includes(template)) {
    return NextResponse.json(
      { success: false, error: "Unknown template" },
      { status: 404 },
    );
  }

  const gms = await requireGmsAdmin();
  const tenantGate = gms.ok ? null : await requireTenantSession();
  if (!gms.ok && (!tenantGate || !tenantGate.ok)) {
    return (
      tenantGate?.response ??
      NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    );
  }
  if (!gms.ok && tenantGate?.ok) {
    const forbidden = requireRoles(tenantGate.session, ["owner", "manager"]);
    if (forbidden) return forbidden;
  }

  let businessName = "Anaz Store";
  let accentColor = "#c81180";
  if (tenantGate?.ok) {
    try {
      const [settings, tenant] = await Promise.all([
        readSettings(),
        readTenant(),
      ]);
      businessName =
        settings.businessName || tenant.brand.businessName || businessName;
      accentColor = tenant.brand.accentColor || accentColor;
    } catch {
      // preview still works with defaults
    }
  }

  const email = renderSampleEmail(template, { businessName, accentColor });
  return new NextResponse(email.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
