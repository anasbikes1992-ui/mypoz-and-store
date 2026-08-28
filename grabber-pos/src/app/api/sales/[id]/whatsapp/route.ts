import { NextRequest, NextResponse } from "next/server";
import { requireTenantSession } from "@/lib/server/auth-session";
import { getRepository } from "@/lib/server/repositories";
import { readSettings } from "@/lib/server/settings-store";
import { buildInvoicePdf } from "@/lib/server/invoice-pdf";
import { invoiceStorefrontCta } from "@/lib/server/storefront-cta";
import { readWhatsAppSettings } from "@/lib/server/whatsapp-inbox-store";
import { resolveMetaAccessToken } from "@/lib/whatsapp/phone-number-id";
import {
  normalizeMobile,
  sendInvoiceViaWhatsApp,
} from "@/lib/server/whatsapp";
import { businessErrorResponse } from "@/lib/server/business-errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTenantSession();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const repo = await getRepository();
    const sale = await repo.findSaleById(id);
    if (!sale) {
      return NextResponse.json(
        { success: false, data: null, error: "Sale not found" },
        { status: 404 },
      );
    }

    let body: { mobile?: string } = {};
    try {
      body = await req.json();
    } catch {
      // optional body
    }
    const mobile = (body.mobile ?? sale.customerMobile ?? "").trim();
    if (!mobile) {
      return NextResponse.json(
        { success: false, data: null, error: "No customer mobile number" },
        { status: 400 },
      );
    }

    const waSettings = await readWhatsAppSettings();
    const orgToken = resolveMetaAccessToken(waSettings.accessToken);
    const orgPhoneId = waSettings.phoneNumberId?.trim() || undefined;
    if (!orgToken || !(orgPhoneId || process.env.WHATSAPP_PHONE_NUMBER_ID)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error:
            "WhatsApp is not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in the environment, or save an org token + phone number id on /whatsapp.",
        },
        { status: 400 },
      );
    }

    const settings = await readSettings();
    const pdf = await buildInvoicePdf(sale, settings);
    const to = normalizeMobile(mobile, settings.whatsappCountryCode);
    const shopCta = invoiceStorefrontCta(settings);
    const result = await sendInvoiceViaWhatsApp({
      to,
      pdf,
      filename: `invoice-${sale.receiptNo || sale.id}.pdf`,
      caption: [
        `Invoice ${sale.receiptNo || sale.id} — ${settings.businessName}`,
        shopCta,
      ]
        .filter(Boolean)
        .join("\n"),
      token: orgToken,
      phoneNumberId: orgPhoneId,
    });
    return NextResponse.json({
      success: true,
      data: { to, messageId: result.messageId },
      error: null,
    });
  } catch (error) {
    return businessErrorResponse(error);
  }
}
